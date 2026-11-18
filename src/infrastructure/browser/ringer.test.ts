import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createTimer } from '@/domain/timer/model/timer'
import { createMemorySoundPlayer } from '../memory/sound-player'
import { createMemorySoundSettingsStore } from '../memory/sound-settings-store'
import { createBrowserRinger } from './ringer'

beforeEach(() => {
  fakeBrowser.reset()
})

const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 180_000, appearance: { colour: 'teal' } })

const soundSettings = createMemorySoundSettingsStore({ endChime: { kind: 'built-in', name: 'bell' }, startChime: { kind: 'built-in', name: 'bell' }, volume: 0.35 })

function shownNotifications() {
  return Object.values(fakeBrowser.notifications.getAllCreateOptions())
}

describe('the browser ringer', () => {
  test('a ring sends a system notification titled with the timer\'s name', async () => {
    await createBrowserRinger({ player: createMemorySoundPlayer(), soundSettings }).ring(tea)

    expect(shownNotifications()).toEqual([expect.objectContaining({ type: 'basic', title: 'Tea', message: 'Its time has run out.' })])
  })

  test('a ring\'s system notification shows the extension\'s icon', async () => {
    await createBrowserRinger({ player: createMemorySoundPlayer(), soundSettings }).ring(tea)

    expect(shownNotifications()).toEqual([expect.objectContaining({ iconUrl: fakeBrowser.runtime.getURL('/icon/128.png') })])
  })

  test('a ring plays the timer\'s ring sound once,at the volume set for rings and chimes', async () => {
    const player = createMemorySoundPlayer()

    await createBrowserRinger({ player, soundSettings }).ring({ ...tea, ringSound: { kind: 'built-in', name: 'marimba' } })

    expect(player.played).toEqual([{ sound: { kind: 'built-in', name: 'marimba' }, volume: 0.35 }])
  })

  test('a ring whose sound cannot play still sends its system notification and ends as rung', async () => {
    const player = { ...createMemorySoundPlayer(), playOnce: () => Promise.reject(new Error('No offscreen document')) }
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(createBrowserRinger({ player, soundSettings }).ring(tea)).resolves.toBeUndefined()

    expect(shownNotifications()).toEqual([expect.objectContaining({ title: 'Tea' })])
  })

  test('a ring whose system notification fails still plays its ring sound and ends as rung', async () => {
    const player = createMemorySoundPlayer()
    vi.spyOn(browser.notifications, 'create').mockRejectedValueOnce(new Error('Notifications are blocked'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(createBrowserRinger({ player, soundSettings }).ring(tea)).resolves.toBeUndefined()

    expect(player.played).toEqual([{ sound: { kind: 'built-in', name: 'bell' }, volume: 0.35 }])
    expect(console.error).toHaveBeenCalled()
  })

  test('a ring does not wait for its sound to finish playing, so a sound that never does holds up no later command', async () => {
    const player = { ...createMemorySoundPlayer(), playOnce: () => new Promise<void>(() => {}) }

    await expect(createBrowserRinger({ player, soundSettings }).ring(tea)).resolves.toBeUndefined()

    expect(shownNotifications()).toEqual([expect.objectContaining({ title: 'Tea' })])
  }, 1_000)
})
