import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { defineComponent, h } from 'vue'
import { createAlarm, type Alarm } from '@/domain/alarm/model/alarm'
import { provideStoredAlarms } from '@/domain/alarm/stored-alarms'
import { provideDisplayClock } from '@/domain/display-clock'
import { provideStoredPlaylists } from '@/domain/music/stored-playlists'
import { provideSounds } from '@/domain/sound/sounds'
import { createFocusSession, pause as pauseSession, start as startSession, taskTimesAt, type FocusSession } from '@/domain/session/model/focus-session'
import { provideStoredSessions } from '@/domain/session/stored-sessions'
import { createTimer, markDone, type Timer } from '@/domain/timer/model/timer'
import { provideStoredTimers } from '@/domain/timer/stored-timers'
import { provideStoredTrackedTime } from '@/domain/tracking/stored-tracked-time'
import { createMemoryBackground } from '@/infrastructure/memory/background'
import { createManualClock } from '@/infrastructure/memory/display-clock'
import { createMemorySounds } from '@/infrastructure/memory/sounds'
import { createMemoryStoredAlarms } from '@/infrastructure/memory/stored-alarms'
import { createMemoryStoredPlaylists } from '@/infrastructure/memory/stored-playlists'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { setupRouter } from '@/infrastructure/plugins/setup-router'
import { provideSnackbar } from '@/ui/n-snackbar/snackbar'
import PopupShell from './popup-shell.vue'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'blue' } })
const answerEmail = createTimer({ id: 'answer-email', name: 'Answer email', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' } })
const tasks = [writeReport, answerEmail]

/** Write report for two focus steps, then answer email: focus 0-25, break, 30-55, break, 60-85, break, 90-95 minutes after the start. */
const morning = createFocusSession({
  id: 'morning',
  name: 'Morning',
  taskIds: ['write-report', 'answer-email'],
  stepLength: 25 * MINUTE,
  breakLength: 5 * MINUTE,
  order: 'one after another'
}, taskTimesAt(tasks, NINE))
const startedAgo = (session: FocusSession, ago: number) => startSession(session, taskTimesAt(tasks, NINE - ago), NINE - ago).session

function renderPopup(path: string, sessions: readonly FocusSession[] = [], timers: readonly Timer[] = tasks, alarms: readonly Alarm[] = []) {
  window.location.hash = `#${path}`
  const clock = createManualClock(NINE)
  const background = createMemoryBackground({ now: () => clock.now.value, timers, sessions })
  render(defineComponent({
    setup() {
      provideStoredTimers(background.storedTimers)
      provideStoredSessions(background.storedSessions)
      provideStoredTrackedTime(background.storedTrackedTime)
      provideStoredAlarms(createMemoryStoredAlarms({ now: () => clock.now.value, alarms }))
      provideStoredPlaylists(createMemoryStoredPlaylists())
      provideDisplayClock(clock.now)
      provideSounds(createMemorySounds())
      provideSnackbar()
      return () => h(PopupShell)
    }
  }), { global: { plugins: [{ install: (app) => setupRouter(app, 'popup') }, createAppI18n()] } })
  return { clock, ...background }
}

describe('the Focus place', () => {
  test('lists every stored focus session as a card', async () => {
    renderPopup('/focus-sessions', [morning, { ...morning, id: 'evening', name: 'Evening' }])

    const section = await screen.findByRole('region', { name: 'All focus sessions' })
    const [first, second, ...others] = within(section).getAllByRole('article')
    expect(first).toHaveAccessibleName('Morning')
    expect(second).toHaveAccessibleName('Evening')
    expect(others).toEqual([])
  })

  test('says how to build a focus session when there are none', async () => {
    renderPopup('/focus-sessions')

    const section = await screen.findByRole('region', { name: 'All focus sessions' })
    expect(within(section).getByText('No focus sessions yet. Choose New to build one from your tasks.')).toBeInTheDocument()
  })

  test('builds a focus session from stored tasks in the dialog that New opens, closes it and says so', async () => {
    const { storedSessions } = renderPopup('/focus-sessions')
    const section = await screen.findByRole('region', { name: 'All focus sessions' })

    await userEvent.click(within(section).getByRole('button', { name: 'New' }))
    const dialog = screen.getByRole('dialog', { name: 'New focus session' })
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Morning')
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Write report' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Morning added')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(section).getByRole('article', { name: 'Morning' })).toBeInTheDocument()
    expect(storedSessions.sessions.value.map(({ name, taskIds }) => ({ name, taskIds }))).toEqual([{ name: 'Morning', taskIds: ['write-report'] }])
  })

  test('saves what is changed in the dialog that Edit opens on a card, and deletes the session from there', async () => {
    const { storedSessions } = renderPopup('/focus-sessions', [morning])

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Morning' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit focus session' })
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), ' focus')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Morning focus saved')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Edit Morning focus' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Edit focus session' })).getByRole('button', { name: 'Delete Morning focus' }))

    expect(await screen.findByText('Morning focus removed')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(storedSessions.sessions.value).toEqual([])
  })

  test('starts, pauses, resumes and ends a session early from its card, saying so each time', async () => {
    renderPopup('/focus-sessions', [morning])
    const card = await screen.findByRole('article', { name: 'Morning' })

    for (const [button, said] of [['Start Morning', 'Morning started'], ['Pause Morning', 'Morning paused'], ['Resume Morning', 'Morning resumed'], ['End Morning early', 'Morning ended early']]) {
      await userEvent.click(within(card).getByRole('button', { name: button }))
      expect(await screen.findByText(said!)).toBeInTheDocument()
    }

    expect(within(card).getByRole('button', { name: 'Start Morning' })).toBeInTheDocument()
  })

  test('pins and unpins a session from its card, saying so each time', async () => {
    const { storedSessions } = renderPopup('/focus-sessions', [morning])
    const card = await screen.findByRole('article', { name: 'Morning' })

    await userEvent.click(within(card).getByRole('button', { name: 'Pin Morning to the overlay' }))
    expect(await screen.findByText('Morning pinned to the overlay')).toBeInTheDocument()
    expect(storedSessions.sessions.value[0]?.pinned).toBe(true)
    await userEvent.click(within(card).getByRole('button', { name: 'Pin Morning to the overlay' }))

    expect(await screen.findByText('Morning unpinned from the overlay')).toBeInTheDocument()
    expect(storedSessions.sessions.value[0]?.pinned).toBe(false)
  })

  test('opens a running session from its card in detail, where a break is skipped and up next is changed for this run only, and goes back to the list', async () => {
    renderPopup('/focus-sessions', [startedAgo(morning, 27 * MINUTE)])

    await userEvent.click(await screen.findByRole('button', { name: 'Open Morning' }))
    const detail = screen.getByRole('region', { name: 'Morning' })
    expect(within(detail).getByRole('progressbar', { name: 'Break' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'All focus sessions' })).not.toBeInTheDocument()
    await userEvent.click(within(detail).getByRole('button', { name: 'Skip the break in Morning' }))
    expect(await screen.findByText('Break skipped in Morning')).toBeInTheDocument()
    expect(within(detail).getByRole('progressbar', { name: 'Focus step' })).toBeInTheDocument()
    await userEvent.click(within(detail).getByRole('button', { name: 'Move step 4, Answer email, earlier' }))
    expect(await screen.findByText('Answer email moved. Changed for this run only.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Back to all focus sessions' }))

    expect(screen.getByRole('region', { name: 'All focus sessions' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Morning' })).not.toBeInTheDocument()
  })

  test('marks a task done from up next of a running session, which takes its steps out of this run', async () => {
    const { storedTimers, storedSessions } = renderPopup('/focus-sessions', [startedAgo(morning, 10 * MINUTE)])

    await userEvent.click(await screen.findByRole('button', { name: 'Open Morning' }))
    await userEvent.click(within(screen.getByRole('list', { name: 'Up next' })).getByRole('button', { name: 'Mark Answer email done' }))

    expect(await screen.findByText('Answer email done; its steps are taken out of this run')).toBeInTheDocument()
    expect(storedTimers.timers.value.find(({ id }) => id === 'answer-email')?.done?.at).toBe(NINE)
    expect(storedSessions.sessions.value[0]?.run?.plan.map(({ taskId }) => taskId)).toEqual(['write-report', 'write-report'])
    expect(within(screen.getByRole('list', { name: 'Up next' })).getAllByRole('listitem')).toHaveLength(1)
  })

  test('marks the task of the current focus step done from beside that step, which ends the step at once so its break starts', async () => {
    const { storedTimers } = renderPopup('/focus-sessions', [startedAgo(morning, 10 * MINUTE)])
    await userEvent.click(await screen.findByRole('button', { name: 'Open Morning' }))
    const detail = screen.getByRole('region', { name: 'Morning' })

    await userEvent.click(within(detail).getByRole('button', { name: 'Mark Write report done and end this focus step' }))

    expect(await screen.findByText('Write report done; its steps are taken out of this run')).toBeInTheDocument()
    expect(storedTimers.timers.value.find(({ id }) => id === 'write-report')?.done?.at).toBe(NINE)
    expect(within(detail).getByRole('progressbar', { name: 'Break' })).toBeInTheDocument()
  })

  test('shows the card of a task in a running session on Today and Timers in that session, with the time the run has left it and only Edit to press', async () => {
    const { clock } = renderPopup('/', [startedAgo(morning, 10 * MINUTE)])
    clock.advanceBy(5 * MINUTE)

    for (const place of ['Today', 'Timers']) {
      await userEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: place }))
      const card = await screen.findByRole('article', { name: 'Write report' })
      expect(within(card).getByText('In Morning')).toBeInTheDocument()
      expect(within(card).getByText('35:00')).toBeInTheDocument()
      expect(within(card).queryByRole('button', { name: 'Start Write report' })).not.toBeInTheDocument()
      expect(within(card).queryByRole('button', { name: 'Reset Write report' })).not.toBeInTheDocument()
      expect(within(card).queryByRole('button', { name: 'Mark Write report done' })).not.toBeInTheDocument()
      expect(within(card).getByRole('button', { name: 'Edit Write report' })).toBeInTheDocument()
    }
  })

  test('shows a session of a repeating task done yesterday ready to start on the day the task comes back, before any command ran', async () => {
    const everyDay = createTimer({ id: 'read', name: 'Read', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' }, repeatDays: [0, 1, 2, 3, 4, 5, 6] })
    const doneYesterday = markDone(everyDay, NINE - 24 * 60 * MINUTE).timer
    const evening = createFocusSession({ id: 'evening', name: 'Evening', taskIds: ['read'], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' }, taskTimesAt([everyDay], NINE))
    renderPopup('/focus-sessions', [evening], [doneYesterday])

    const card = await screen.findByRole('article', { name: 'Evening' })
    expect(within(card).getByText('2 focus steps of 25m with 5m breaks')).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Start Evening' })).toBeEnabled()
  })

  test('pins a running session to the overlay from its detail and unpins it there, saying so each time', async () => {
    const { storedSessions } = renderPopup('/focus-sessions', [startedAgo(morning, 10 * MINUTE)])
    await userEvent.click(await screen.findByRole('button', { name: 'Open Morning' }))
    const detail = screen.getByRole('region', { name: 'Morning' })

    await userEvent.click(within(detail).getByRole('button', { name: 'Pin Morning to the overlay' }))
    expect(await screen.findByText('Morning pinned to the overlay')).toBeInTheDocument()
    expect(storedSessions.sessions.value[0]?.pinned).toBe(true)
    await userEvent.click(within(detail).getByRole('button', { name: 'Pin Morning to the overlay', pressed: true }))

    expect(await screen.findByText('Morning unpinned from the overlay')).toBeInTheDocument()
    expect(storedSessions.sessions.value[0]?.pinned).toBe(false)
  })

  test('moves focus into the detail when a session opens, and back to its Open button when going back', async () => {
    renderPopup('/focus-sessions', [startedAgo(morning, 10 * MINUTE)])

    await userEvent.click(await screen.findByRole('button', { name: 'Open Morning' }))
    expect(screen.getByRole('button', { name: 'Back to all focus sessions' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')

    expect(await screen.findByRole('button', { name: 'Open Morning' })).toHaveFocus()
  })
})

describe('Today with focus sessions', () => {
  test('shows running and paused focus sessions first, above timers and tasks, and no session that has not started', async () => {
    const evening = startedAgo({ ...morning, id: 'evening', name: 'Evening', taskIds: ['answer-email'] }, 5 * MINUTE)
    renderPopup('/', [startedAgo(morning, 10 * MINUTE), { ...morning, id: 'later', name: 'Later' }, pauseSession(evening, NINE).session])

    await screen.findByRole('region', { name: 'Timers and tasks' })
    const sections = screen.getAllByRole('region')
    expect(sections.slice(0, 2).map((section) => within(section).getByRole('heading', { level: 2 }).textContent)).toEqual(['Focus sessions now', 'Timers and tasks'])
    const now = within(sections[0]!).getAllByRole('article')
    expect(now).toHaveLength(2)
    expect(now[0]).toHaveAccessibleName('Morning')
    expect(now[1]).toHaveAccessibleName('Evening')
  })

  test('shows the focus sessions, then the alarms still to ring today, then the timers and tasks', async () => {
    const lateEveryDay = createAlarm({ id: 'late', name: 'Late', time: 23 * 60 * MINUTE + 59 * MINUTE, days: { kind: 'repeating', repeatDays: [0, 1, 2, 3, 4, 5, 6] }, sendsNotification: false })
    renderPopup('/', [startedAgo(morning, 10 * MINUTE)], tasks, [lateEveryDay])

    const alarmsToday = await screen.findByRole('region', { name: 'Alarms today' })
    const sessionsNow = screen.getByRole('region', { name: 'Focus sessions now' })
    const timersAndTasks = screen.getByRole('region', { name: 'Timers and tasks' })
    expect(sessionsNow.compareDocumentPosition(alarmsToday) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(alarmsToday.compareDocumentPosition(timersAndTasks) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test('opens a focus session from Today in detail on the Focus place', async () => {
    renderPopup('/', [startedAgo(morning, 10 * MINUTE)])

    await userEvent.click(await screen.findByRole('button', { name: 'Open Morning' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Focus sessions' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Focus step' })).toBeInTheDocument()
  })
})

describe('a whole focus session, by keyboard only', () => {
  async function press(button: HTMLElement, key = '{Enter}') {
    button.focus()
    await userEvent.keyboard(key)
  }

  const status = () => screen.getByRole('status')

  test('builds a session from two tasks, starts it, skips its break, moves a step for this run only, pauses with a delay and ends it early', async () => {
    const { clock } = renderPopup('/focus-sessions')
    const section = await screen.findByRole('region', { name: 'All focus sessions' })

    await press(within(section).getByRole('button', { name: 'New' }))
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus()
    await userEvent.keyboard('Morning')
    await userEvent.tab()
    expect(screen.getByRole('checkbox', { name: 'Write report' })).toHaveFocus()
    await userEvent.keyboard(' ')
    await userEvent.tab()
    expect(screen.getByRole('checkbox', { name: 'Answer email' })).toHaveFocus()
    await userEvent.keyboard(' ')
    await press(screen.getByRole('button', { name: 'Save' }))
    expect(await within(status()).findByText('Morning added')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const card = within(section).getByRole('article', { name: 'Morning' })
    expect(within(card).getByText('4 focus steps of 25m with 5m breaks')).toBeInTheDocument()
    await press(within(card).getByRole('button', { name: 'Start Morning' }))
    expect(await within(status()).findByText('Morning started')).toBeInTheDocument()

    clock.advanceBy(27 * MINUTE)
    expect(await within(card).findByText('Break, next: Write report')).toBeInTheDocument()
    await press(within(card).getByRole('button', { name: 'Open Morning' }))
    const detail = screen.getByRole('region', { name: 'Morning' })
    expect(within(detail).getByRole('progressbar', { name: 'Break' })).toBeInTheDocument()
    expect(within(detail).getByText('03:00')).toBeInTheDocument()

    await press(within(detail).getByRole('button', { name: 'Skip the break in Morning' }))
    expect(await within(status()).findByText('Break skipped in Morning')).toBeInTheDocument()
    expect(within(detail).getByRole('progressbar', { name: 'Focus step' })).toBeInTheDocument()
    expect(within(detail).getByText('Step 2 of 4')).toBeInTheDocument()

    await press(within(detail).getByRole('button', { name: 'Move step 4, Answer email, earlier' }))
    expect(await within(status()).findByText('Answer email moved. Changed for this run only.')).toBeInTheDocument()
    expect(within(detail).getByRole('button', { name: 'Move step 3, Answer email, later' })).toHaveFocus()

    await press(within(detail).getByRole('button', { name: 'Pause Morning' }))
    expect(await within(status()).findByText('Morning paused')).toBeInTheDocument()
    expect(within(detail).getByRole('progressbar', { name: 'Paused' })).toBeInTheDocument()
    clock.advanceBy(10 * MINUTE)
    expect(await within(detail).findByText('10m later from pausing')).toBeInTheDocument()

    await press(within(detail).getByRole('button', { name: 'End Morning early' }))
    expect(await within(status()).findByText('Morning ended early')).toBeInTheDocument()
    const list = await screen.findByRole('region', { name: 'All focus sessions' })
    expect(within(list).getByRole('button', { name: 'Start Morning' })).toBeInTheDocument()
  })
})
