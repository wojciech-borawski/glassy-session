import { render, screen, waitFor, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { defineComponent, h, shallowRef } from 'vue'
import { provideStoredAlarms } from '@/domain/alarm/stored-alarms'
import { provideDisplayClock } from '@/domain/display-clock'
import { provideStoredPlaylists } from '@/domain/music/stored-playlists'
import { provideSounds } from '@/domain/sound/sounds'
import { createFocusSession, start as startSession, taskTimesAt, type FocusSession } from '@/domain/session/model/focus-session'
import { provideStoredSessions } from '@/domain/session/stored-sessions'
import { createTimer, start, type Timer } from '@/domain/timer/model/timer'
import type { StoredTimers } from '@/domain/timer/ports'
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
import type { Moment } from '@/utils/time/units'
import PopupShell from './popup-shell.vue'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 90 * MINUTE, appearance: { colour: 'blue' } })
const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 4 * MINUTE, appearance: { colour: 'gold' } })

type ShellOptions = Readonly<{ sessions?: readonly FocusSession[], startsAt?: Moment }>

function renderShell(timers: readonly Timer[], path = '/', port?: StoredTimers, { sessions = [], startsAt = NINE }: ShellOptions = {}) {
  window.location.hash = `#${path}`
  const clock = createManualClock(startsAt)
  const background = createMemoryBackground({ now: () => clock.now.value, timers, sessions })
  const storedTimers = port ?? background.storedTimers
  render(defineComponent({
    setup() {
      provideStoredTimers(storedTimers)
      provideStoredSessions(background.storedSessions)
      provideStoredTrackedTime(background.storedTrackedTime)
      provideStoredAlarms(createMemoryStoredAlarms({ now: () => clock.now.value }))
      provideStoredPlaylists(createMemoryStoredPlaylists())
      provideDisplayClock(clock.now)
      provideSounds(createMemorySounds())
      provideSnackbar()
      return () => h(PopupShell)
    }
  }), { global: { plugins: [{ install: (app) => setupRouter(app, 'popup') }, createAppI18n()] } })
  return { clock, storedTimers, storedSessions: background.storedSessions }
}

/** Write report for two focus steps, then answer email: focus 0-25, break, 30-55, break, 60-85, break, 90-95 minutes after the start. */
const answerEmail = createTimer({ id: 'answer-email', name: 'Answer email', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' } })
const morningTasks = [createTimer({ ...writeReport, plannedTime: 50 * MINUTE }), answerEmail]
const morning = createFocusSession({
  id: 'morning',
  name: 'Morning',
  taskIds: ['write-report', 'answer-email'],
  stepLength: 25 * MINUTE,
  breakLength: 5 * MINUTE,
  order: 'one after another'
}, taskTimesAt(morningTasks, NINE))
const morningStartedAgo = (ago: number) => startSession(morning, taskTimesAt(morningTasks, NINE - ago), NINE - ago).session

describe('the popup with stored timers', () => {
  test('lists every stored timer and task on Today', async () => {
    renderShell([writeReport, tea])

    const section = await screen.findByRole('region', { name: 'Timers and tasks' })
    expect(within(section).getByRole('article', { name: 'Write report' })).toBeInTheDocument()
    expect(within(section).getByRole('article', { name: 'Tea' })).toBeInTheDocument()
  })

  test('lists every stored timer and task on Timers as well', async () => {
    renderShell([writeReport, tea], '/timers')

    const section = await screen.findByRole('region', { name: 'All timers and tasks' })
    expect(within(section).getByRole('article', { name: 'Write report' })).toBeInTheDocument()
    expect(within(section).getByRole('article', { name: 'Tea' })).toBeInTheDocument()
  })

  test('starts and pauses a timer from its card, saying so each time, and counts it down as the clock moves', async () => {
    const { clock } = renderShell([writeReport])
    const card = await screen.findByRole('article', { name: 'Write report' })

    await userEvent.click(within(card).getByRole('button', { name: 'Start Write report' }))
    expect(await screen.findByText('Write report started')).toBeInTheDocument()
    clock.advanceBy(10 * MINUTE)
    expect(await within(card).findByText('1:20:00')).toBeInTheDocument()
    await userEvent.click(within(card).getByRole('button', { name: 'Pause Write report' }))

    expect(await screen.findByText('Write report paused')).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Start Write report' })).toBeInTheDocument()
  })

  test('adds a task from the dialog that New opens, closes it and says so', async () => {
    const { storedTimers } = renderShell([])
    const section = await screen.findByRole('region', { name: 'Timers and tasks' })

    await userEvent.click(within(section).getByRole('button', { name: 'New' }))
    const dialog = screen.getByRole('dialog', { name: 'New task' })
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Write report{Enter}')

    expect(await screen.findByText('Write report added')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(section).getByRole('article', { name: 'Write report' })).toBeInTheDocument()
    expect(storedTimers.timers.value.map(({ name, kind, plannedTime }) => ({ name, kind, plannedTime }))).toEqual([{ name: 'Write report', kind: 'task', plannedTime: 25 * MINUTE }])
  })

  test('saves new details from the dialog that Edit opens on a card', async () => {
    renderShell([writeReport, tea])

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Tea' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit timer' })
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), ' with lemon')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Tea with lemon saved')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Tea with lemon' })).toBeInTheDocument()
  })

  test('removes a timer from the dialog that Edit opens, closes it and says so', async () => {
    const { storedTimers } = renderShell([writeReport, tea])

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Tea' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Edit timer' })).getByRole('button', { name: 'Delete Tea' }))

    expect(await screen.findByText('Tea removed')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Tea' })).not.toBeInTheDocument()
    expect(storedTimers.timers.value.map(({ id }) => id)).toEqual(['write-report'])
  })

  test('keeps the dialog open with what was filled in when the command is refused, and says why', async () => {
    const refusing: StoredTimers = { timers: shallowRef([]), send: async () => ({ reason: 'failed', message: 'Storage is full' }) }
    renderShell([], '/', refusing)

    await userEvent.click(await screen.findByRole('button', { name: 'New' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Write report{Enter}')

    expect(await screen.findByText('That did not work: Storage is full')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Write report')
  })

  test('shows a running timer in the running bar on every place, and pauses it from there', async () => {
    renderShell([start(tea, NINE - MINUTE).timer, writeReport], '/alarms')

    const bar = await screen.findByRole('region', { name: 'Counting down' })
    expect(within(bar).getByText('03:00')).toBeInTheDocument()
    await userEvent.click(within(bar).getByRole('button', { name: 'Pause Tea' }))

    expect(await screen.findByText('Tea paused')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Counting down' })).not.toBeInTheDocument()
  })

  test('shows a running focus session in the running bar before the timers, and pauses it from there', async () => {
    renderShell([...morningTasks, start(tea, NINE - MINUTE).timer], '/alarms', undefined, { sessions: [morningStartedAgo(10 * MINUTE)] })

    const bar = await screen.findByRole('region', { name: 'Counting down' })
    expect(within(bar).getAllByRole('listitem').map((chip) => chip.textContent)).toEqual(['Morning15:00', 'Tea03:00'])
    await userEvent.click(within(bar).getByRole('button', { name: 'Pause Morning' }))

    expect(await screen.findByText('Morning paused')).toBeInTheDocument()
    expect(within(bar).getAllByRole('listitem').map((chip) => chip.textContent)).toEqual(['Tea03:00'])
  })
})

describe('tasks over days on Today and Timers', () => {
  const originalTimeZone = process.env.TZ

  beforeAll(() => {
    process.env.TZ = 'Europe/Warsaw'
  })

  afterAll(() => {
    if (originalTimeZone === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = originalTimeZone
    }
  })

  const mondaysAndWednesdays = createTimer({ id: 'read', name: 'Read', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' }, repeatDays: [1, 3] })
  const tuesdays = createTimer({ id: 'gym', name: 'Gym', kind: 'task', plannedTime: 60 * MINUTE, appearance: { colour: 'orange' }, repeatDays: [2] })

  test('Today shows the timers, the one-time tasks and the repeating tasks whose repeat day is today, while Timers shows them all', async () => {
    renderShell([writeReport, tea, mondaysAndWednesdays, tuesdays])

    const today = await screen.findByRole('region', { name: 'Timers and tasks' })
    expect(within(today).getByRole('article', { name: 'Write report' })).toBeInTheDocument()
    expect(within(today).getByRole('article', { name: 'Tea' })).toBeInTheDocument()
    expect(within(today).getByRole('article', { name: 'Gym' })).toBeInTheDocument()
    expect(within(today).queryByRole('article', { name: 'Read' })).not.toBeInTheDocument()

    await userEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Timers' }))
    const all = await screen.findByRole('region', { name: 'All timers and tasks' })
    const read = within(all).getByRole('article', { name: 'Read' })
    expect(within(read).getByRole('img', { name: 'Repeats on Monday and Wednesday' })).toBeInTheDocument()
    expect(within(all).getAllByRole('article')).toHaveLength(4)
  })

  test('a task marked done on Today moves under Finished, greyed, and comes back from there with undo done', async () => {
    renderShell([writeReport, tea])
    const today = await screen.findByRole('region', { name: 'Timers and tasks' })

    await userEvent.click(within(today).getByRole('button', { name: 'Mark Write report done' }))

    expect(await screen.findByText('Write report marked done')).toBeInTheDocument()
    const finished = within(today).getByRole('heading', { name: 'Finished' }).nextElementSibling as HTMLElement
    const card = within(finished).getByRole('article', { name: 'Write report' })
    expect(card).toHaveClass('n-card--greyed')
    await userEvent.click(within(card).getByRole('button', { name: 'Undo done for Write report' }))

    expect(await screen.findByText('Write report is no longer done')).toBeInTheDocument()
    expect(within(today).queryByRole('heading', { name: 'Finished' })).not.toBeInTheDocument()
    expect(within(today).getByText('1:30:00')).toBeInTheDocument()
  })

  test('a task repeating on Monday and Wednesday, finished on Monday, is under Finished, gone from Today on Tuesday while Timers keeps it, and back with all of its time on Wednesday', async () => {
    const { clock } = renderShell([], '/', undefined, { startsAt: new Date('2026-11-16T09:00').getTime() })
    const today = await screen.findByRole('region', { name: 'Timers and tasks' })

    await userEvent.click(within(today).getByRole('button', { name: 'New' }))
    const dialog = screen.getByRole('dialog', { name: 'New task' })
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Read')
    await userEvent.clear(within(dialog).getByRole('spinbutton', { name: 'Minutes' }))
    await userEvent.type(within(dialog).getByRole('spinbutton', { name: 'Minutes' }), '30')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Repeating' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Monday' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Wednesday' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Read added')).toBeInTheDocument()
    await userEvent.click(within(today).getByRole('button', { name: 'Start Read' }))
    expect(await screen.findByText('Read started')).toBeInTheDocument()

    clock.advanceBy(30 * MINUTE)
    const finished = await within(today).findByRole('heading', { name: 'Finished' })
    const doneOnMonday = within(finished.nextElementSibling as HTMLElement).getByRole('article', { name: 'Read' })
    expect(doneOnMonday).toHaveClass('n-card--greyed')
    expect(within(doneOnMonday).getByText('Done for the day')).toBeInTheDocument()

    clock.advanceBy(24 * 60 * MINUTE)
    await waitFor(() => expect(within(today).queryByRole('article', { name: 'Read' })).not.toBeInTheDocument())
    await userEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Timers' }))
    const all = await screen.findByRole('region', { name: 'All timers and tasks' })
    expect(within(all).getByRole('article', { name: 'Read' })).toHaveClass('n-card--greyed')

    clock.advanceBy(24 * 60 * MINUTE)
    await userEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Today' }))
    const backOnWednesday = await within(await screen.findByRole('region', { name: 'Timers and tasks' })).findByRole('article', { name: 'Read' })
    expect(backOnWednesday).not.toHaveClass('n-card--greyed')
    expect(within(backOnWednesday).getByText('30:00')).toBeInTheDocument()
    await userEvent.click(within(backOnWednesday).getByRole('button', { name: 'Start Read' }))
    await waitFor(() => expect(screen.getAllByText('Read started')).toHaveLength(2))
    clock.advanceBy(MINUTE)
    expect(await within(backOnWednesday).findByText('29:00')).toBeInTheDocument()
  })
})

describe('a repeating task after midnight in every view', () => {
  const originalTimeZone = process.env.TZ

  beforeAll(() => {
    process.env.TZ = 'Europe/Warsaw'
  })

  afterAll(() => {
    if (originalTimeZone === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = originalTimeZone
    }
  })

  const everyDay = createTimer({ id: 'read', name: 'Read', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' }, repeatDays: [0, 1, 2, 3, 4, 5, 6] })
  const tuesdayLate = () => new Date('2026-11-17T23:50').getTime()

  test('a repeating task left running late on Tuesday leaves the running bar after midnight, when Today shows it back idle with all of its time', async () => {
    const { clock } = renderShell([start(everyDay, tuesdayLate()).timer], '/', undefined, { startsAt: tuesdayLate() })
    const bar = await screen.findByRole('region', { name: 'Counting down' })
    expect(within(bar).getByText('Read')).toBeInTheDocument()

    clock.advanceBy(15 * MINUTE)

    await waitFor(() => expect(screen.queryByRole('region', { name: 'Counting down' })).not.toBeInTheDocument())
    const today = await screen.findByRole('region', { name: 'Timers and tasks' })
    expect(within(within(today).getByRole('article', { name: 'Read' })).getByText('30:00')).toBeInTheDocument()
  })

  test('a repeating task in a focus session that runs past midnight shows on Timers the time the run has left it, not all of its time', async () => {
    const night = createFocusSession({ id: 'night', name: 'Night', taskIds: ['read'], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' }, taskTimesAt([everyDay], tuesdayLate()))
    const running = startSession(night, taskTimesAt([everyDay], tuesdayLate()), tuesdayLate()).session
    const { clock } = renderShell([everyDay], '/timers', undefined, { sessions: [running], startsAt: tuesdayLate() })
    const all = await screen.findByRole('region', { name: 'All timers and tasks' })

    clock.advanceBy(20 * MINUTE)

    expect(await within(within(all).getByRole('article', { name: 'Read' })).findByText('10:00')).toBeInTheDocument()
  })
})

describe('a whole round with a task, by keyboard only', () => {
  async function press(button: HTMLElement, key = '{Enter}') {
    button.focus()
    await userEvent.keyboard(key)
  }

  const status = () => screen.getByRole('status')

  test('adds, starts, counts down, pauses from the bar, renames, resets and removes a task, saying each step in the snackbar', async () => {
    const { clock } = renderShell([])
    const section = await screen.findByRole('region', { name: 'Timers and tasks' })
    const newButton = within(section).getByRole('button', { name: 'New' })

    await press(newButton)
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus()
    await userEvent.keyboard('Write report')
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    expect(screen.getByRole('spinbutton', { name: 'Hours' })).toHaveFocus()
    await userEvent.tab()
    await userEvent.keyboard('{Control>}a{/Control}30{Enter}')
    expect(await within(status()).findByText('Write report added')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(newButton).toHaveFocus()

    const card = within(section).getByRole('article', { name: 'Write report' })
    expect(within(card).getByText('30:00')).toBeInTheDocument()
    await press(within(card).getByRole('button', { name: 'Start Write report' }), ' ')
    expect(await within(status()).findByText('Write report started')).toBeInTheDocument()

    clock.advanceBy(10 * MINUTE)
    const bar = await screen.findByRole('region', { name: 'Counting down' })
    expect(await within(card).findByText('20:00')).toBeInTheDocument()
    expect(within(bar).getByText('20:00')).toBeInTheDocument()
    await press(within(bar).getByRole('button', { name: 'Pause Write report' }))
    expect(await within(status()).findByText('Write report paused')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Counting down' })).not.toBeInTheDocument()

    const editButton = within(card).getByRole('button', { name: 'Edit Write report' })
    await press(editButton)
    const dialog = screen.getByRole('dialog', { name: 'Edit task' })
    await userEvent.keyboard('{Control>}a{/Control}Write summary{Enter}')
    expect(await within(status()).findByText('Write summary saved')).toBeInTheDocument()
    expect(dialog).not.toBeInTheDocument()

    const renamed = within(section).getByRole('article', { name: 'Write summary' })
    expect(within(renamed).getByText('20:00')).toBeInTheDocument()
    await press(within(renamed).getByRole('button', { name: 'Reset Write summary' }))
    expect(await within(status()).findByText('Write summary reset')).toBeInTheDocument()
    expect(within(renamed).getByText('30:00')).toBeInTheDocument()

    await press(within(renamed).getByRole('button', { name: 'Edit Write summary' }))
    await press(within(screen.getByRole('dialog', { name: 'Edit task' })).getByRole('button', { name: 'Delete Write summary' }))
    expect(await within(status()).findByText('Write summary removed')).toBeInTheDocument()
    expect(within(section).getByText('No timers or tasks yet. Choose New to add one.')).toBeInTheDocument()
  })

  test('moves focus to New after Delete, since the card whose Edit opened the dialog is gone', async () => {
    renderShell([writeReport, tea])
    const section = await screen.findByRole('region', { name: 'Timers and tasks' })

    await press(within(section).getByRole('button', { name: 'Edit Tea' }))
    await press(within(screen.getByRole('dialog', { name: 'Edit timer' })).getByRole('button', { name: 'Delete Tea' }))

    expect(await within(status()).findByText('Tea removed')).toBeInTheDocument()
    expect(within(section).getByRole('button', { name: 'New' })).toHaveFocus()
  })

  test('closes the dialog with Escape without adding anything, and gives focus back to New', async () => {
    const { storedTimers } = renderShell([])
    const newButton = within(await screen.findByRole('region', { name: 'Timers and tasks' })).getByRole('button', { name: 'New' })

    await press(newButton)
    await userEvent.keyboard('Write report{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(newButton).toHaveFocus()
    expect(storedTimers.timers.value).toEqual([])
  })

  test('opens Statistics narrowed to a task from the Statistics button in its dialog, closing the dialog', async () => {
    renderShell([writeReport, tea], '/timers')

    await userEvent.click(within(await screen.findByRole('article', { name: 'Write report' })).getByRole('button', { name: 'Edit Write report' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Edit task' })).getByRole('button', { name: 'Statistics for Write report' }))

    expect(await screen.findByRole('button', { name: 'Statistics', current: 'page' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Write report', pressed: true })).toBeInTheDocument()
  })

  test('keeps the task filter of Statistics while moving to another tab and back, both the one a card narrowed it to and one chosen on the page', async () => {
    const readMail = createTimer({ id: 'read-mail', name: 'Read mail', kind: 'task', plannedTime: 15 * MINUTE, appearance: { colour: 'green' } })
    renderShell([writeReport, readMail], '/timers')
    const tabBar = await screen.findByRole('navigation')

    await userEvent.click(within(await screen.findByRole('article', { name: 'Write report' })).getByRole('button', { name: 'Statistics for Write report' }))
    await screen.findByRole('button', { name: 'Write report', pressed: true })
    await userEvent.click(within(tabBar).getByRole('button', { name: 'Timers' }))
    await userEvent.click(within(tabBar).getByRole('button', { name: 'Statistics' }))

    expect(await screen.findByRole('button', { name: 'Write report', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All tasks', pressed: false })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Read mail', pressed: false }))
    await userEvent.click(within(tabBar).getByRole('button', { name: 'Today' }))
    await userEvent.click(within(tabBar).getByRole('button', { name: 'Statistics' }))

    expect(await screen.findByRole('button', { name: 'Read mail', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Write report', pressed: true })).toBeInTheDocument()
  })

  test('a task repeating on Monday and Wednesday, run 40 of its 60 minutes on Monday, says on Wednesday how Monday went, and its Statistics narrowed from its card shows that repeat day', async () => {
    const gym = createTimer({ id: 'gym', name: 'Gym', kind: 'task', plannedTime: 60 * MINUTE, appearance: { colour: 'orange' }, repeatDays: [1, 3] })
    const { clock } = renderShell([gym], '/', undefined, { startsAt: NINE - 24 * 60 * MINUTE })

    await userEvent.click(within(await screen.findByRole('article', { name: 'Gym' })).getByRole('button', { name: 'Start Gym' }))
    clock.advanceBy(40 * MINUTE)
    await userEvent.click(await within(screen.getByRole('article', { name: 'Gym' })).findByRole('button', { name: 'Pause Gym' }))
    await screen.findByText('Gym paused')
    clock.advanceBy(2 * 24 * 60 * MINUTE - 40 * MINUTE)

    const card = await screen.findByRole('article', { name: 'Gym' })
    expect(await within(card).findByText('Last time: 40m of 1h')).toBeInTheDocument()
    await userEvent.click(within(card).getByRole('button', { name: 'Statistics for Gym' }))

    expect(await screen.findByRole('button', { name: 'Gym', pressed: true })).toBeInTheDocument()
    const gymDays = screen.getByRole('list', { name: 'Gym: 0 of 1 repeat days finished' })
    expect(within(gymDays).getAllByRole('listitem').map((day) => day.textContent?.trim())).toEqual(['Mon, Nov 16: 40m of 1h, unfinished'])
  })
})
