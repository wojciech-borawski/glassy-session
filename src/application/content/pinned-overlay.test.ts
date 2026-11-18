import { render, screen, waitFor, within } from '@testing-library/vue'
import { defineComponent, h } from 'vue'
import { provideDisplayClock } from '@/domain/display-clock'
import { provideStoredPlaylists } from '@/domain/music/stored-playlists'
import { provideStoredOverlaySettings } from '@/domain/overlay/stored-overlay-settings'
import { createFocusSession, pin as pinSession, start as startSession, taskTimesAt, type FocusSession } from '@/domain/session/model/focus-session'
import { provideStoredSessions } from '@/domain/session/stored-sessions'
import { createTimer, markDone, pin, start, type Timer } from '@/domain/timer/model/timer'
import { provideStoredTimers } from '@/domain/timer/stored-timers'
import { createMemoryBackground } from '@/infrastructure/memory/background'
import { createManualClock } from '@/infrastructure/memory/display-clock'
import { createMemoryOverlaySettings } from '@/infrastructure/memory/overlay-settings'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { provideSnackbar } from '@/ui/n-snackbar/snackbar'
import PinnedOverlay from './pinned-overlay.vue'

const MINUTE = 60_000

/** Tuesday 17 November 2026, 23:50 on the machine's own clock. */
const TUESDAY_LATE = new Date(2026, 10, 17, 23, 50).getTime()

const everyDay = createTimer({ id: 'read', name: 'Read', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' }, repeatDays: [0, 1, 2, 3, 4, 5, 6] })

function renderOverlay(timers: readonly Timer[], sessions: readonly FocusSession[] = []) {
  const clock = createManualClock(TUESDAY_LATE)
  const background = createMemoryBackground({ now: () => clock.now.value, timers, sessions })
  render(defineComponent({
    setup() {
      provideStoredTimers(background.storedTimers)
      provideStoredSessions(background.storedSessions)
      provideStoredPlaylists(background.storedPlaylists)
      provideStoredOverlaySettings(createMemoryOverlaySettings())
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
