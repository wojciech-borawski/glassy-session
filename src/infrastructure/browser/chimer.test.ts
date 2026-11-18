import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createFocusSession } from '@/domain/session/model/focus-session'
import { createMemorySoundPlayer } from '../memory/sound-player'
import { createMemorySoundSettingsStore } from '../memory/sound-settings-store'
import { createBrowserChimer } from './chimer'

beforeEach(() => {
  fakeBrowser.reset()
})

const morning = createFocusSession(
  { id: 'morning', name: 'Morning', taskIds: ['write-report'], stepLength: 1_500_000, breakLength: 300_000, order: 'one after another' },
  [{ taskId: 'write-report', remainingTime: 3_000_000 }]
)

const soundSettings = createMemorySoundSettingsStore({ endChime: { kind: 'built-in', name: 'digital' }, startChime: { kind: 'audio file', fileId: 'birds' }, volume: 0.5 })

function createChimer(player = createMemorySoundPlayer()) {
  return createBrowserChimer({ player, soundSettings })
}

function shownNotifications() {
  return Object.values(fakeBrowser.notifications.getAllCreateOptions())
}

describe('the browser chimer', () => {
  test.each([
    ['focus step', 'A focus step has ended.'],
    ['break', 'The break has ended.'],
    ['session', 'The focus session has ended.']
  ] as const)('a chime for the end of a %s sends a system notification titled with the session\'s name', async (ending, message) => {
    await createChimer().chime(morning, ending)

    expect(shownNotifications()).toEqual([expect.objectContaining({ type: 'basic', title: 'Morning', message })])
  })

  test('a chime whose system notification fails still plays its chime and ends as chimed', async () => {
    const player = createMemorySoundPlayer()
    vi.spyOn(browser.notifications, 'create').mockRejectedValueOnce(new Error('Notifications are blocked'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(createChimer(player).chime(morning, 'focus step')).resolves.toBeUndefined()

    expect(player.played).toEqual([{ sound: { kind: 'built-in', name: 'digital' }, volume: 0.5 }])
  })

  test('a later chime of the same session replaces the notification of the one before', async () => {
    const chimer = createChimer()

    await chimer.chime(morning, 'focus step')
    await chimer.chime(morning, 'break')

    expect(shownNotifications()).toEqual([expect.objectContaining({ message: 'The break has ended.' })])
  })

  test.each([
    ['a focus step', 'the end chime', 'focus step', { kind: 'built-in', name: 'digital' }],
    ['the whole session', 'the end chime', 'session', { kind: 'built-in', name: 'digital' }],
    ['a break', 'the start chime', 'break', { kind: 'audio file', fileId: 'birds' }]
  ] as const)('the end of %s plays %s chosen in settings, at the volume set for rings and chimes', async (_what, _chime, ending, sound) => {
    const player = createMemorySoundPlayer()

    await createChimer(player).chime(morning, ending)

    expect(player.played).toEqual([{ sound, volume: 0.5 }])
  })
})
