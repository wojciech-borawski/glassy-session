import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createAlarm } from '@/domain/alarm/model/alarm'
import { ringSoundOf } from '@/domain/sound/model/sound'
import { createMemorySoundPlayer } from '../memory/sound-player'
import { createMemorySoundSettingsStore } from '../memory/sound-settings-store'
import { createBrowserAlarmRinger } from './alarm-ringer'

beforeEach(() => {
  fakeBrowser.reset()
})

const HOUR = 3_600_000

const wakeUp = createAlarm({ id: 'wake-up', name: 'Wake up', time: 7 * HOUR + 1_800_000, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: true })

const soundSettings = createMemorySoundSettingsStore({ endChime: { kind: 'built-in', name: 'bell' }, startChime: { kind: 'built-in', name: 'bell' }, volume: 0.6 })

function createRinger(player = createMemorySoundPlayer()) {
  return createBrowserAlarmRinger({ player, soundSettings })
}

function shownNotifications() {
  return Object.values(fakeBrowser.notifications.getAllCreateOptions())
}

describe('the browser alarm ringer', () => {
  test('an alarm that sends a system notification rings with one titled with its name, saying its time', async () => {
    await createRinger().ring(wakeUp)

    expect(shownNotifications()).toEqual([expect.objectContaining({ type: 'basic', title: 'Wake up', message: 'It is 07:30.' })])
  })

  test('an alarm whose system notification fails still plays its ring sound and ends as rung', async () => {
    const player = createMemorySoundPlayer()
    vi.spyOn(browser.notifications, 'create').mockRejectedValueOnce(new Error('Notifications are blocked'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(createRinger(player).ring(wakeUp)).resolves.toBeUndefined()

    expect(player.played).toEqual([{ sound: ringSoundOf(wakeUp), volume: 0.6 }])
  })

  test('an alarm that sends no system notification shows none when it rings, and still plays its ring sound', async () => {
    const player = createMemorySoundPlayer()

    await createRinger(player).ring({ ...wakeUp, sendsNotification: false, ringSound: { kind: 'audio file', fileId: 'gong' } })

    expect(shownNotifications()).toEqual([])
    expect(player.played).toEqual([{ sound: { kind: 'audio file', fileId: 'gong' }, volume: 0.6 }])
  })

  test('a missed alarm shows one quiet system notification saying when it was due, also when it sends none when it rings, and plays no sound', async () => {
    const dueAt = new Date(2026, 10, 24, 7, 30).getTime()

    const player = createMemorySoundPlayer()

    await createRinger(player).tellMissed({ ...wakeUp, sendsNotification: false }, dueAt)

    expect(shownNotifications()).toEqual([expect.objectContaining({ title: 'Wake up', message: 'Missed: it was due at 07:30 on Tuesday, November 24.', silent: true })])
    expect(player.played).toEqual([])
  })
})
