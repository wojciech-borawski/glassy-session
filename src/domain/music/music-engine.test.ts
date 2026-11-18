import { createMemoryAudioFileStore } from '@/infrastructure/memory/audio-file-store'
import { createMemoryMusicStore } from '@/infrastructure/memory/music-store'
import { createCommandQueue } from '../command/command-queue'
import type { SoundUse } from '../sound/model/sound-use'
import { createMusicEngine } from './music-engine'
import { createPlaylist, type AudioFile, type Playlist } from './model/playlist'
import type { SavedMusic } from './ports'

const MINUTE = 60_000

const rain: AudioFile = { id: 'rain', name: 'rain.mp3', length: 3 * MINUTE }
const waves: AudioFile = { id: 'waves', name: 'waves.ogg', length: 4 * MINUTE }
const birds: AudioFile = { id: 'birds', name: 'birds.wav' }

const focusMix: Playlist = { id: 'focus-mix', name: 'Focus mix', files: [rain, waves] }

/** An engine over the music given, with the bytes of every file in its playlists kept, and the uses given as those of rings and chimes. */
function setup(saved?: SavedMusic, soundUses: readonly SoundUse[] = []) {
  const musicStore = createMemoryMusicStore(saved)
  const audioFiles = createMemoryAudioFileStore(saved?.playlists.flatMap(({ files }) => files.map(({ id, name }) => ({ id, name, type: 'audio/mpeg' }))))
  const engine = createMusicEngine({ inTurn: createCommandQueue(), musicStore, audioFiles, soundUses: async () => soundUses })
  return { engine, audioFiles, stored: () => musicStore.load(), keptFileIds: async () => (await audioFiles.list()).map(({ id }) => id) }
}

describe('playlists', () => {
  test('an added playlist is stored with its name and no files', async () => {
    const { engine, stored } = setup()

    expect(await engine.run({ type: 'addPlaylist', playlist: { id: 'focus-mix', name: 'Focus mix' } })).toBeNull()

    expect((await stored()).playlists).toEqual([createPlaylist({ id: 'focus-mix', name: 'Focus mix' })])
  })

  test('adding a playlist whose id is already stored changes nothing', async () => {
    const { engine, stored } = setup()
    await engine.run({ type: 'addPlaylist', playlist: { id: 'focus-mix', name: 'Focus mix' } })

    await engine.run({ type: 'addPlaylist', playlist: { id: 'focus-mix', name: 'Rain' } })

    expect((await stored()).playlists).toEqual([createPlaylist({ id: 'focus-mix', name: 'Focus mix' })])
  })

  test('a renamed playlist is stored with its new name and keeps its files', async () => {
    const { engine, stored } = setup({ playlists: [focusMix], backgroundSounds: [] })

    expect(await engine.run({ type: 'renamePlaylist', playlistId: 'focus-mix', name: 'Deep focus' })).toBeNull()

    expect((await stored()).playlists).toEqual([{ ...focusMix, name: 'Deep focus' }])
  })

  test('a command for a playlist that is not stored is refused as already removed and changes nothing', async () => {
    const { engine, stored } = setup({ playlists: [focusMix], backgroundSounds: [] })

    expect(await engine.run({ type: 'renamePlaylist', playlistId: 'rainy-day', name: 'Deep focus' })).toEqual({ reason: 'already removed' })

    expect((await stored()).playlists).toEqual([focusMix])
  })
})

describe('audio files in a playlist', () => {
  test('added files go after the files already there, in the order given', async () => {
    const { engine, stored } = setup({ playlists: [{ ...focusMix, files: [rain] }], backgroundSounds: [] })

    expect(await engine.run({ type: 'addFiles', playlistId: 'focus-mix', files: [waves, birds] })).toBeNull()

    expect((await stored()).playlists).toEqual([{ ...focusMix, files: [rain, waves, birds] }])
  })

  test('a removed file leaves the playlist, and its bytes are forgotten', async () => {
    const { engine, stored, keptFileIds } = setup({ playlists: [focusMix], backgroundSounds: [] })

    expect(await engine.run({ type: 'removeFile', playlistId: 'focus-mix', fileId: 'rain' })).toBeNull()

    expect((await stored()).playlists).toEqual([{ ...focusMix, files: [waves] }])
    expect(await keptFileIds()).toEqual(['waves'])
  })

  test('a file removed from one playlist keeps its bytes while another playlist still lists it', async () => {
    const rainyDay: Playlist = { id: 'rainy-day', name: 'Rainy day', files: [rain] }
    const { engine, stored, keptFileIds } = setup({ playlists: [focusMix, rainyDay], backgroundSounds: [] })

    await engine.run({ type: 'removeFile', playlistId: 'focus-mix', fileId: 'rain' })

    expect((await stored()).playlists).toEqual([{ ...focusMix, files: [waves] }, rainyDay])
    expect(await keptFileIds()).toEqual(['rain', 'waves'])
  })

  test('a file removed from its playlist keeps its bytes while a timer or an alarm rings with it', async () => {
    const { engine, stored, keptFileIds } = setup({ playlists: [focusMix], backgroundSounds: [] }, [{ sound: { kind: 'audio file', fileId: 'rain' }, by: { kind: 'timer', name: 'Tea' } }])

    expect(await engine.run({ type: 'removeFile', playlistId: 'focus-mix', fileId: 'rain' })).toBeNull()

    expect((await stored()).playlists).toEqual([{ ...focusMix, files: [waves] }])
    expect(await keptFileIds()).toEqual(['rain', 'waves'])
  })

  test('a moved file takes its new place in the playlist, and every file keeps its bytes', async () => {
    const { engine, stored, keptFileIds } = setup({ playlists: [{ ...focusMix, files: [rain, waves, birds] }], backgroundSounds: [] })

    expect(await engine.run({ type: 'moveFile', playlistId: 'focus-mix', from: 2, to: 0 })).toBeNull()

    expect((await stored()).playlists).toEqual([{ ...focusMix, files: [birds, rain, waves] }])
    expect(await keptFileIds()).toEqual(['rain', 'waves', 'birds'])
  })
})

describe('background sounds', () => {
  const pasta = { of: 'timer', id: 'pasta' } as const
  const morning = { of: 'focus session', id: 'morning' } as const

  test('a chosen background sound is stored for its timer or focus session', async () => {
    const { engine, stored } = setup({ playlists: [focusMix], backgroundSounds: [] })

    expect(await engine.run({ type: 'chooseBackgroundSound', owner: pasta, sound: { playlistId: 'focus-mix', volume: 0.3 } })).toBeNull()
    await engine.run({ type: 'chooseBackgroundSound', owner: morning, sound: { playlistId: null, volume: 0.8 } })

    expect((await stored()).backgroundSounds).toEqual([
      { owner: pasta, sound: { playlistId: 'focus-mix', volume: 0.3 } },
      { owner: morning, sound: { playlistId: null, volume: 0.8 } }
    ])
  })

  test('choosing again replaces what the timer or focus session chose before, and a timer and a focus session with the same id each keep their own', async () => {
    const pastaSession = { of: 'focus session', id: 'pasta' } as const
    const { engine, stored } = setup({ playlists: [focusMix], backgroundSounds: [{ owner: pasta, sound: { playlistId: 'focus-mix', volume: 0.3 } }, { owner: pastaSession, sound: { playlistId: 'focus-mix', volume: 0.6 } }] })

    await engine.run({ type: 'chooseBackgroundSound', owner: pasta, sound: { playlistId: 'focus-mix', volume: 0.9 } })

    expect((await stored()).backgroundSounds).toEqual([
      { owner: pasta, sound: { playlistId: 'focus-mix', volume: 0.9 } },
      { owner: pastaSession, sound: { playlistId: 'focus-mix', volume: 0.6 } }
    ])
  })

  test('choosing a playlist that is not stored is refused as already removed and changes nothing', async () => {
    const { engine, stored } = setup({ playlists: [focusMix], backgroundSounds: [] })

    expect(await engine.run({ type: 'chooseBackgroundSound', owner: pasta, sound: { playlistId: 'rainy-day', volume: 0.3 } })).toEqual({ reason: 'already removed' })

    expect((await stored()).backgroundSounds).toEqual([])
  })

  test('a volume outside 0 to 1 fails and is not stored', async () => {
    const { engine, stored } = setup({ playlists: [focusMix], backgroundSounds: [] })

    await expect(engine.run({ type: 'chooseBackgroundSound', owner: pasta, sound: { playlistId: 'focus-mix', volume: 1.5 } })).rejects.toThrow(RangeError)

    expect((await stored()).backgroundSounds).toEqual([])
  })

  test('a removed playlist leaves every timer and focus session that chose it with none at the volume it had, and forgets the bytes of its files', async () => {
    const rainyDay: Playlist = { id: 'rainy-day', name: 'Rainy day', files: [birds] }
    const { engine, stored, keptFileIds } = setup({
      playlists: [focusMix, rainyDay],
      backgroundSounds: [
        { owner: pasta, sound: { playlistId: 'focus-mix', volume: 0.3 } },
        { owner: morning, sound: { playlistId: 'focus-mix', volume: 0.8 } },
        { owner: { of: 'timer', id: 'tea' }, sound: { playlistId: 'rainy-day', volume: 0.5 } }
      ]
    })

    expect(await engine.run({ type: 'removePlaylist', playlistId: 'focus-mix' })).toBeNull()

    expect(await stored()).toEqual({
      playlists: [rainyDay],
      backgroundSounds: [
        { owner: pasta, sound: { playlistId: null, volume: 0.3 } },
        { owner: morning, sound: { playlistId: null, volume: 0.8 } },
        { owner: { of: 'timer', id: 'tea' }, sound: { playlistId: 'rainy-day', volume: 0.5 } }
      ]
    })
    expect(await keptFileIds()).toEqual(['birds'])
  })

  test('forgetting the background sound of a removed timer or focus session takes away its choice and keeps the others', async () => {
    const tea = { of: 'timer', id: 'tea' } as const
    const { engine, stored } = setup({
      playlists: [focusMix],
      backgroundSounds: [
        { owner: pasta, sound: { playlistId: 'focus-mix', volume: 0.3 } },
        { owner: morning, sound: { playlistId: 'focus-mix', volume: 0.8 } },
        { owner: tea, sound: { playlistId: null, volume: 0.5 } }
      ]
    })

    await engine.forgetSoundOf(pasta)
    await engine.forgetSoundOf(morning)

    expect(await stored()).toEqual({ playlists: [focusMix], backgroundSounds: [{ owner: tea, sound: { playlistId: null, volume: 0.5 } }] })
  })

  test('a removed playlist keeps the bytes of a file that a chime plays', async () => {
    const { engine, keptFileIds } = setup({ playlists: [focusMix], backgroundSounds: [] }, [{ sound: { kind: 'built-in', name: 'bell' }, by: { kind: 'start chime' } }, { sound: { kind: 'audio file', fileId: 'waves' }, by: { kind: 'end chime' } }])

    expect(await engine.run({ type: 'removePlaylist', playlistId: 'focus-mix' })).toBeNull()

    expect(await keptFileIds()).toEqual(['waves'])
  })
})

describe('own audio files', () => {
  test('removing an audio file that nothing plays forgets its bytes', async () => {
    const { engine, audioFiles, keptFileIds } = setup()
    const piano = await audioFiles.save({ name: 'piano.mp3', type: 'audio/mpeg', bytes: new ArrayBuffer(1) })

    expect(await engine.run({ type: 'removeAudioFile', fileId: piano })).toBeNull()

    expect(await keptFileIds()).toEqual([])
  })

  test('removing an audio file that a playlist, a ring or a chime still plays is refused, naming each of them, and keeps its bytes', async () => {
    const { engine, keptFileIds } = setup({ playlists: [focusMix], backgroundSounds: [] }, [
      { sound: { kind: 'audio file', fileId: 'rain' }, by: { kind: 'timer', name: 'Tea' } },
      { sound: { kind: 'audio file', fileId: 'rain' }, by: { kind: 'end chime' } }
    ])

    expect(await engine.run({ type: 'removeAudioFile', fileId: 'rain' })).toEqual({
      reason: 'audio file in use',
      usedBy: [{ kind: 'timer', name: 'Tea' }, { kind: 'end chime' }, { kind: 'playlist', name: 'Focus mix' }]
    })

    expect(await keptFileIds()).toEqual(['rain', 'waves'])
  })

  test('the audio files a ring sound or a chime let go of are forgotten when nothing plays them any more, and kept while something does', async () => {
    const uses: SoundUse[] = []
    const { engine, audioFiles, keptFileIds } = setup({ playlists: [focusMix], backgroundSounds: [] }, uses)
    const piano = await audioFiles.save({ name: 'piano.mp3', type: 'audio/mpeg', bytes: new ArrayBuffer(1) })
    const gong = await audioFiles.save({ name: 'gong.mp3', type: 'audio/mpeg', bytes: new ArrayBuffer(1) })
    const unused = await audioFiles.save({ name: 'unused.mp3', type: 'audio/mpeg', bytes: new ArrayBuffer(1) })
    uses.push({ sound: { kind: 'audio file', fileId: gong }, by: { kind: 'alarm', name: 'Wake up' } })

    await engine.forgetUnusedFiles(['rain', piano, gong])

    expect(await keptFileIds()).toEqual(['rain', 'waves', gong, unused])
  })
})

describe('what follows a music command', () => {
  test('the music before and after each command that changed it is handed on in the turn of the command, and a refused one hands on nothing', async () => {
    const followed: (readonly [SavedMusic, SavedMusic])[] = []
    const saved: SavedMusic = { playlists: [focusMix], backgroundSounds: [] }
    const engine = createMusicEngine({
      inTurn: createCommandQueue(),
      musicStore: createMemoryMusicStore(saved),
      audioFiles: createMemoryAudioFileStore(),
      soundUses: async () => [],
      followMusic: async (before, after) => {
        followed.push([before, after])
      }
    })
    const choice = { owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'focus-mix', volume: 0.3 } } as const

    await engine.run({ type: 'chooseBackgroundSound', ...choice })
    await engine.run({ type: 'renamePlaylist', playlistId: 'rainy-day', name: 'Rain' })

    expect(followed).toEqual([[saved, { ...saved, backgroundSounds: [choice] }]])
  })
})
