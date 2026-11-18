import { render, screen, waitFor, within } from '@testing-library/vue'
import { defineComponent, h } from 'vue'
import { provideDisplayClock } from '@/domain/display-clock'
import { provideStoredPlaylists } from '@/domain/music/stored-playlists'
import { defaultOverlaySettings } from '@/domain/overlay/model/overlay-settings'
import { provideStoredOverlaySettings } from '@/domain/overlay/stored-overlay-settings'
import { createFocusSession, pin as pinSession, start as startSession, taskTimesAt, type FocusSession } from '@/domain/session/model/focus-session'
import { provideStoredSessions } from '@/domain/session/stored-sessions'
import { createTimer, markDone, pause, pin, start, type Timer } from '@/domain/timer/model/timer'
import { provideStoredTimers } from '@/domain/timer/stored-timers'
import { createMemoryBackground } from '@/infrastructure/memory/background'
import { createManualClock } from '@/infrastructure/memory/display-clock'
import { createMemoryOverlaySettings } from '@/infrastructure/memory/overlay-settings'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { icons } from '@/ui/n-icon/icons'
import { provideSnackbar } from '@/ui/n-snackbar/snackbar'
import PinnedOverlay from './pinned-overlay.vue'

const MINUTE = 60_000

/** Tuesday 17 November 2026, 23:50 on the machine's own clock. */
const TUESDAY_LATE = new Date(2026, 10, 17, 23, 50).getTime()

const everyDay = createTimer({ id: 'read', name: 'Read', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' }, repeatDays: [0, 1, 2, 3, 4, 5, 6] })

function renderOverlay(timers: readonly Timer[], sessions: readonly FocusSession[] = [], { collapsed = false } = {}) {
  const clock = createManualClock(TUESDAY_LATE)
  const background = createMemoryBackground({ now: () => clock.now.value, timers, sessions })
  render(defineComponent({
    setup() {
      provideStoredTimers(background.storedTimers)
      provideStoredSessions(background.storedSessions)
      provideStoredPlaylists(background.storedPlaylists)
      provideStoredOverlaySettings(createMemoryOverlaySettings({ ...defaultOverlaySettings, collapsed }))
      provideDisplayClock(clock.now)
      provideSnackbar()
      return () => h(PinnedOverlay)
    }
  }), { global: { plugins: [createAppI18n()] } })
  return clock
}

const rowOf = async (name: string) => within(await screen.findByRole('region', { name: 'Pinned timers and focus sessions' })).getByRole('listitem', { name })

describe('the pinned overlay', () => {
  test('shows a pinned repeating task left running late on Tuesday back idle with all of its time after midnight, as the popup does', async () => {
    const clock = renderOverlay([pin(start(everyDay, TUESDAY_LATE).timer).timer])
    const row = await rowOf('Read')
    expect(within(row).getByRole('button', { name: 'Pause Read' })).toBeInTheDocument()

    clock.advanceBy(15 * MINUTE)

    await waitFor(() => expect(row).toHaveTextContent('30:00'))
    expect(within(row).getByRole('button', { name: 'Start Read' })).toBeInTheDocument()
  })

  test('shows a pinned task that a running focus session uses in that session, with the time the run has left it and no start', async () => {
    const reading = { ...everyDay, repeatDays: undefined }
    const night = createFocusSession({ id: 'night', name: 'Night', taskIds: ['read'], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' }, taskTimesAt([reading], TUESDAY_LATE))
    const clock = renderOverlay([pin(reading).timer], [pinSession(startSession(night, taskTimesAt([reading], TUESDAY_LATE), TUESDAY_LATE).session)])
    const row = await rowOf('Read')

    clock.advanceBy(10 * MINUTE)

    await waitFor(() => expect(row).toHaveTextContent('20:00'))
    expect(row).toHaveTextContent('In Night')
    expect(within(row).queryByRole('button', { name: 'Start Read' })).not.toBeInTheDocument()
  })

  test('shows a pinned session of a repeating task done on Tuesday ready to start after midnight, as the popup does', async () => {
    const night = createFocusSession({ id: 'night', name: 'Night', taskIds: ['read'], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' }, taskTimesAt([everyDay], TUESDAY_LATE))
    const clock = renderOverlay([markDone(everyDay, TUESDAY_LATE).timer], [pinSession(night)])
    const row = await rowOf('Night')
    expect(within(row).getByRole('button', { name: 'Start Night' })).toBeDisabled()

    clock.advanceBy(15 * MINUTE)

    await waitFor(() => expect(within(row).getByRole('button', { name: 'Start Night' })).toBeEnabled())
    expect(row).toHaveTextContent('35m')
  })
})

const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 4 * MINUTE, appearance: { colour: 'gold' } })
const stretch = createTimer({ id: 'stretch', name: 'Stretch', kind: 'timer', plannedTime: 10 * MINUTE, appearance: { colour: 'violet' } })
const walk = createTimer({ id: 'walk', name: 'Walk', kind: 'timer', plannedTime: 20 * MINUTE, appearance: { colour: 'blue' } })
const reading = { ...everyDay, repeatDays: undefined }

/** Night, pinned and started that long ago: a focus step of reading for 25 minutes, a break of 5, then the last 5 minutes of reading. */
function nightStarted(ago: number): FocusSession {
  const night = createFocusSession({ id: 'night', name: 'Night', taskIds: ['read'], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' }, taskTimesAt([reading], TUESDAY_LATE))
  return pinSession(startSession(night, taskTimesAt([reading], TUESDAY_LATE - ago), TUESDAY_LATE - ago).session)
}

/** Night ten minutes into its first focus step, so 15 minutes of it are left. */
const nightTenMinutesIn = () => nightStarted(10 * MINUTE)

const pill = () => screen.getByRole('button', { name: /^Show the overlay/ })

describe('the collapsed overlay', () => {
  test('with one pinned timer running, shows its remaining time on the pill', async () => {
    renderOverlay([pin(start(tea, TUESDAY_LATE - 90_000).timer).timer], [], { collapsed: true })

    await waitFor(() => expect(pill()).toHaveTextContent('02:30'))
    expect(pill()).toHaveAccessibleName('Show the overlay, Tea, 02:30 left')
  })

  test('with nothing pinned running, shows how many are pinned on the pill', async () => {
    const pausedTea = pause(start(tea, TUESDAY_LATE - 2 * MINUTE).timer, TUESDAY_LATE - MINUTE).timer
    renderOverlay([pin(pausedTea).timer, pin(everyDay).timer], [], { collapsed: true })

    await waitFor(() => expect(pill()).toHaveTextContent(/^2$/))
  })

  test('counts the time on the pill down as the display clock moves', async () => {
    const clock = renderOverlay([pin(start(tea, TUESDAY_LATE - 90_000).timer).timer], [], { collapsed: true })
    await waitFor(() => expect(pill()).toHaveTextContent('02:30'))

    clock.advanceBy(70_000)

    await waitFor(() => expect(pill()).toHaveTextContent('01:20'))
  })

  test('with a pinned focus session and a pinned timer running, shows the session first, with what is left of its focus step', async () => {
    renderOverlay([pin(start(tea, TUESDAY_LATE - 90_000).timer).timer, reading], [nightTenMinutesIn()], { collapsed: true })

    await waitFor(() => expect(pill()).toHaveTextContent('15:00'))
  })

  test('with a pinned focus session on a break, shows a cup in the calm colour of a break instead of the focus target, and says it is a break', async () => {
    renderOverlay([reading], [nightStarted(27 * MINUTE)], { collapsed: true })

    await waitFor(() => expect(pill()).toHaveTextContent('03:00'))
    expect(pill().querySelector('svg path')).toHaveAttribute('d', icons.cup)
    expect(pill().querySelector('svg')).toHaveClass('pinned-overlay__break')
    expect(pill()).toHaveAccessibleName('Show the overlay, Night, break, 03:00 left')
  })

  test('with three pinned timers running, shows the first one and +2 for the others', async () => {
    renderOverlay([tea, stretch, walk].map((timer) => pin(start(timer, TUESDAY_LATE - MINUTE).timer).timer), [], { collapsed: true })

    await waitFor(() => expect(pill()).toHaveTextContent('03:00+2'))
  })

  test('does not count a paused pinned timer among the others running', async () => {
    const pausedStretch = pause(start(stretch, TUESDAY_LATE - 2 * MINUTE).timer, TUESDAY_LATE - MINUTE).timer
    renderOverlay([start(tea, TUESDAY_LATE - MINUTE).timer, pausedStretch, start(walk, TUESDAY_LATE - MINUTE).timer].map((timer) => pin(timer).timer), [], { collapsed: true })

    await waitFor(() => expect(pill()).toHaveTextContent('03:00+1'))
  })

  test('names on the pill the one it shows, its remaining time and how many more are running', async () => {
    renderOverlay([pin(start(tea, TUESDAY_LATE - 90_000).timer).timer, reading], [nightTenMinutesIn()], { collapsed: true })

    expect(await screen.findByRole('button', { name: 'Show the overlay, Night, 15:00 left, 1 more running' })).toBeInTheDocument()
  })
})
