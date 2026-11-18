import { IDBFactory } from 'fake-indexeddb'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { sendAlarmCommand } from '@/infrastructure/browser/alarm-commands'
import { createBrowserAudioFileStore } from '@/infrastructure/browser/audio-file-store'
import { sendMusicCommand } from '@/infrastructure/browser/music-commands'
import { readStoredMusic } from '@/infrastructure/browser/music-store'
import { sendSessionCommand } from '@/infrastructure/browser/session-commands'
import { createBrowserSoundSettingsStore } from '@/infrastructure/browser/sound-settings-store'
import { sendTimerCommand } from '@/infrastructure/browser/timer-commands'
import { runEngines } from './run-engines'

beforeEach(async () => {
  fakeBrowser.reset()
  globalThis.indexedDB = new IDBFactory()
  await runEngines()
})

describe('the background running music commands', () => {
  test('playlists and background sounds sent from another context are stored', async () => {
    expect(await sendMusicCommand({ type: 'addPlaylist', playlist: { id: 'focus-mix', name: 'Focus mix' } })).toBeNull()
    expect(await sendMusicCommand({ type: 'chooseBackgroundSound', owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'focus-mix', volume: 0.3 } })).toBeNull()

    expect(await readStoredMusic()).toEqual({
      playlists: [{ id: 'focus-mix', name: 'Focus mix', files: [] }],
      backgroundSounds: [{ owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'focus-mix', volume: 0.3 } }]
    })
  })

  test('a removed playlist forgets the bytes of its files, except those a timer or an alarm rings with or a chime plays', async () => {
    const audioFiles = createBrowserAudioFileStore()
    const keep = (name: string) => audioFiles.save({ name, type: 'audio/mpeg', bytes: new ArrayBuffer(1) })
    const [rain, waves, birds, piano] = [await keep('rain.mp3'), await keep('waves.mp3'), await keep('birds.mp3'), await keep('piano.mp3')]
    await sendTimerCommand({ type: 'add', timer: { id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 180_000, appearance: { colour: 'teal' }, ringSound: { kind: 'audio file', fileId: rain } } })
    await sendAlarmCommand({ type: 'add', alarm: { id: 'wake-up', name: 'Wake up', time: 27_000_000, days: { kind: 'repeating', repeatDays: [1] }, sendsNotification: true, ringSound: { kind: 'audio file', fileId: waves } } })
    await createBrowserSoundSettingsStore().save({ endChime: { kind: 'audio file', fileId: birds }, startChime: { kind: 'built-in', name: 'bell' }, volume: 0.5 })
    await sendMusicCommand({ type: 'addPlaylist', playlist: { id: 'focus-mix', name: 'Focus mix' } })
    await sendMusicCommand({ type: 'addFiles', playlistId: 'focus-mix', files: [rain, waves, birds, piano].map((id) => ({ id, name: id })) })

    expect(await sendMusicCommand({ type: 'removePlaylist', playlistId: 'focus-mix' })).toBeNull()

    expect((await audioFiles.list()).map(({ name }) => name)).toEqual(['rain.mp3', 'waves.mp3', 'birds.mp3'])
  })

  test('a ring sound or a chime that no longer plays an audio file has the background forget its bytes, once nothing else plays it', async () => {
    const audioFiles = createBrowserAudioFileStore()
    const keep = (name: string) => audioFiles.save({ name, type: 'audio/mpeg', bytes: new ArrayBuffer(1) })
    const [rain, gong, birds, piano] = [await keep('rain.mp3'), await keep('gong.mp3'), await keep('birds.mp3'), await keep('piano.mp3')]
    const tea = { id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 180_000, appearance: { colour: 'teal' }, ringSound: { kind: 'audio file', fileId: rain } } as const
    const wakeUp = { id: 'wake-up', name: 'Wake up', time: 27_000_000, days: { kind: 'repeating', repeatDays: [1] }, sendsNotification: true, ringSound: { kind: 'audio file', fileId: gong } } as const
    const soundSettings = createBrowserSoundSettingsStore()
    await sendTimerCommand({ type: 'add', timer: tea })
    await sendAlarmCommand({ type: 'add', alarm: wakeUp })
    await soundSettings.save({ endChime: { kind: 'audio file', fileId: birds }, startChime: { kind: 'audio file', fileId: piano }, volume: 0.5 })
    await sendMusicCommand({ type: 'addPlaylist', playlist: { id: 'focus-mix', name: 'Focus mix' } })
    await sendMusicCommand({ type: 'addFiles', playlistId: 'focus-mix', files: [{ id: piano, name: 'piano.mp3' }] })

    await sendTimerCommand({ type: 'change', timerId: 'tea', details: { ...tea, ringSound: { kind: 'built-in', name: 'bell' } } })
    await sendAlarmCommand({ type: 'remove', alarmId: 'wake-up' })
    await soundSettings.save({ endChime: { kind: 'built-in', name: 'bell' }, startChime: { kind: 'built-in', name: 'bell' }, volume: 0.5 })

    await vi.waitFor(async () => expect((await audioFiles.list()).map(({ name }) => name)).toEqual(['piano.mp3']))
  })

  test('removing an audio file that a timer rings with is refused, naming the timer, and its bytes stay kept', async () => {
    const audioFiles = createBrowserAudioFileStore()
    const rain = await audioFiles.save({ name: 'rain.mp3', type: 'audio/mpeg', bytes: new ArrayBuffer(1) })
    await sendTimerCommand({ type: 'add', timer: { id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 180_000, appearance: { colour: 'teal' }, ringSound: { kind: 'audio file', fileId: rain } } })

    expect(await sendMusicCommand({ type: 'removeAudioFile', fileId: rain })).toEqual({ reason: 'audio file in use', usedBy: [{ kind: 'timer', name: 'Tea' }] })

    expect(await audioFiles.list()).toHaveLength(1)
  })

  test('removing a timer or a focus session takes away its background sound and leaves the others', async () => {
    const pasta = { id: 'pasta', name: 'Pasta', kind: 'timer', plannedTime: 600_000, appearance: { colour: 'gold' } } as const
    const tea = { ...pasta, id: 'tea', name: 'Tea' }
    const morning = { id: 'morning', name: 'Morning', taskIds: [], stepLength: 600_000, breakLength: 300_000, order: 'one after another' } as const
    await sendTimerCommand({ type: 'add', timer: pasta })
    await sendTimerCommand({ type: 'add', timer: tea })
    await sendSessionCommand({ type: 'add', session: morning })
    await sendMusicCommand({ type: 'addPlaylist', playlist: { id: 'focus-mix', name: 'Focus mix' } })
    for (const owner of [{ of: 'timer', id: 'pasta' }, { of: 'timer', id: 'tea' }, { of: 'focus session', id: 'morning' }] as const) {
      await sendMusicCommand({ type: 'chooseBackgroundSound', owner, sound: { playlistId: 'focus-mix', volume: 0.3 } })
    }

    expect(await sendTimerCommand({ type: 'remove', timerId: 'pasta' })).toBeNull()
    expect(await sendSessionCommand({ type: 'remove', sessionId: 'morning' })).toBeNull()

    expect((await readStoredMusic()).backgroundSounds).toEqual([{ owner: { of: 'timer', id: 'tea' }, sound: { playlistId: 'focus-mix', volume: 0.3 } }])
  })

  test('removing a timer that was already removed still takes its background sound away', async () => {
    await sendMusicCommand({ type: 'addPlaylist', playlist: { id: 'focus-mix', name: 'Focus mix' } })
    await sendMusicCommand({ type: 'chooseBackgroundSound', owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'focus-mix', volume: 0.3 } })

    expect(await sendTimerCommand({ type: 'remove', timerId: 'pasta' })).toEqual({ reason: 'already removed' })

    expect((await readStoredMusic()).backgroundSounds).toEqual([])
  })

  test('a refused remove keeps the background sound of the task it left stored', async () => {
    const writing = { id: 'writing', name: 'Writing', kind: 'task', plannedTime: 3_600_000, appearance: { colour: 'blue' } } as const
    await sendTimerCommand({ type: 'add', timer: writing })
    await sendSessionCommand({ type: 'add', session: { id: 'morning', name: 'Morning', taskIds: ['writing'], stepLength: 600_000, breakLength: 300_000, order: 'one after another' } })
    await sendSessionCommand({ type: 'start', sessionId: 'morning' })
    await sendMusicCommand({ type: 'addPlaylist', playlist: { id: 'focus-mix', name: 'Focus mix' } })
    await sendMusicCommand({ type: 'chooseBackgroundSound', owner: { of: 'timer', id: 'writing' }, sound: { playlistId: 'focus-mix', volume: 0.3 } })

    expect(await sendTimerCommand({ type: 'remove', timerId: 'writing' })).toMatchObject({ reason: 'task in use' })

    expect((await readStoredMusic()).backgroundSounds).toEqual([{ owner: { of: 'timer', id: 'writing' }, sound: { playlistId: 'focus-mix', volume: 0.3 } }])
  })
})
