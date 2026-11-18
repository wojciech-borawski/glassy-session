import { createMemoryMusicStore } from '@/infrastructure/memory/music-store'
import { createMemoryPlaybackStore } from '@/infrastructure/memory/playback-store'
import { createMemorySoundPlayer } from '@/infrastructure/memory/sound-player'
import { createCommandQueue } from '../command/command-queue'
import type { SoundOwner } from './model/playback'
import type { Playlist } from './model/playlist'
import { createPlaybackEngine } from './playback-engine'
import type { SavedMusic } from './ports'

const SECOND = 1_000

const focusMix: Playlist = { id: 'focus-mix', name: 'Focus mix', files: [{ id: 'rain', name: 'rain.mp3' }, { id: 'waves', name: 'waves.ogg' }, { id: 'piano', name: 'piano.wav' }] }

const pasta: SoundOwner = { of: 'timer', id: 'pasta' }

const tea: SoundOwner = { of: 'timer', id: 'tea' }

const calm: Playlist = { id: 'calm', name: 'Calm', files: [{ id: 'birds', name: 'birds.mp3' }] }

/** What the background settles before it plays a stored sound again, when nothing finished while it was stopped. */
const nothingToSettle = async () => {}

const pastaOnFocusMix: SavedMusic = { playlists: [focusMix], backgroundSounds: [{ owner: pasta, sound: { playlistId: 'focus-mix', volume: 0.6 } }] }

function setup(saved: SavedMusic = pastaOnFocusMix) {
  const player = createMemorySoundPlayer()
  const playbackStore = createMemoryPlaybackStore()
  const musicStore = createMemoryMusicStore(saved)
  const engine = createPlaybackEngine({ inTurn: createCommandQueue(), musicStore, playbackStore, player })
  /** Stores the music as a music command leaves it, and has the engine follow the change as the music engine does in its turn. */
  async function changeMusic(after: SavedMusic) {
    const before = await musicStore.load()
    await musicStore.save(after)
    await engine.followMusic(before, after)
  }
  return { engine, player, playbackStore, changeMusic }
}

describe('playing with the sound owner', () => {
  test('a timer with a playlist that starts plays its first file from the beginning at its volume', async () => {
    const { engine, player } = setup()

    await engine.ownersChanged([{ type: 'owner started', owner: pasta }])

    expect(player.filePlaying()).toEqual({ fileId: 'rain', at: 0, volume: 0.6 })
  })

  test('a timer that pauses pauses its sound, and resuming plays on from the place the player paused at', async () => {
    const { engine, player } = setup()
    await engine.ownersChanged([{ type: 'owner started', owner: pasta }])
    player.playFor(40 * SECOND)

    await engine.ownersChanged([{ type: 'owner paused', owner: pasta }])
    expect(player.filePlaying()).toBeNull()
    await engine.ownersChanged([{ type: 'owner resumed', owner: pasta }])

    expect(player.filePlaying()).toEqual({ fileId: 'rain', at: 40 * SECOND, volume: 0.6 })
  })

  test('a second timer started is heard instead, and when it pauses the first one plays on from where it got to', async () => {
    const { engine, player } = setup({ ...pastaOnFocusMix, playlists: [focusMix, calm], backgroundSounds: [...pastaOnFocusMix.backgroundSounds, { owner: tea, sound: { playlistId: 'calm', volume: 0.3 } }] })
    await engine.ownersChanged([{ type: 'owner started', owner: pasta }])
    player.playFor(30 * SECOND)

    await engine.ownersChanged([{ type: 'owner started', owner: tea }])
    expect(player.filePlaying()).toEqual({ fileId: 'birds', at: 0, volume: 0.3 })
    player.playFor(5 * SECOND)
    await engine.ownersChanged([{ type: 'owner paused', owner: tea }])

    expect(player.filePlaying()).toEqual({ fileId: 'rain', at: 30 * SECOND, volume: 0.6 })
  })

  test('a timer that finishes stops its sound, and started again it plays its playlist from the first file', async () => {
    const { engine, player } = setup()
    await engine.ownersChanged([{ type: 'owner started', owner: pasta }])
    player.playFor(30 * SECOND)

    await engine.ownersChanged([{ type: 'owner finished', owner: pasta }])
    expect(player.filePlaying()).toBeNull()
    await engine.ownersChanged([{ type: 'owner started', owner: pasta }])

    expect(player.filePlaying()).toEqual({ fileId: 'rain', at: 0, volume: 0.6 })
  })
})

describe('going through the playlist', () => {
  test('when the player reports that a file ended, the next file plays from its beginning', async () => {
    const { engine, player } = setup()
    await engine.ownersChanged([{ type: 'owner started', owner: pasta }])
    player.endFile()

    await engine.fileEnded('rain')

    expect(player.filePlaying()).toEqual({ fileId: 'waves', at: 0, volume: 0.6 })
  })

  test('when the player reports that no file of the playlist can play, one after the other, the sound is stored as stopped and the player plays nothing', async () => {
    const { engine, player, playbackStore } = setup()
    await engine.ownersChanged([{ type: 'owner started', owner: pasta }])

    await engine.fileCannotPlay('rain')
    expect(player.filePlaying()).toEqual({ fileId: 'waves', at: 0, volume: 0.6 })
    await engine.fileCannotPlay('waves')
    await engine.fileCannotPlay('piano')

    expect(player.filePlaying()).toBeNull()
    expect(await player.fileCued()).toBeNull()
    expect(await playbackStore.load()).toMatchObject({ soundPaused: true, playing: null, unplayable: ['rain', 'waves', 'piano'] })
  })
})

describe('the person playing the heard sound', () => {
  test('the sound paused by the person stays paused while its timer runs, and comes back from its place at the next break', async () => {
    const { engine, player } = setup()
    await engine.ownersChanged([{ type: 'owner started', owner: pasta }])
    player.playFor(20 * SECOND)

    expect(await engine.run({ type: 'pauseSound' })).toBeNull()
    expect(player.filePlaying()).toBeNull()
    await engine.ownersChanged([{ type: 'break started' }])

    expect(player.filePlaying()).toEqual({ fileId: 'rain', at: 20 * SECOND, volume: 0.6 })
  })

  test('the person resumes the sound they paused, from its place', async () => {
    const { engine, player } = setup()
    await engine.ownersChanged([{ type: 'owner started', owner: pasta }])
    player.playFor(20 * SECOND)
    await engine.run({ type: 'pauseSound' })

    await engine.run({ type: 'resumeSound' })

    expect(player.filePlaying()).toEqual({ fileId: 'rain', at: 20 * SECOND, volume: 0.6 })
  })

  test('the person goes to the next file and back to the previous one, each from its beginning', async () => {
    const { engine, player } = setup()
    await engine.ownersChanged([{ type: 'owner started', owner: pasta }])
    player.playFor(20 * SECOND)

    await engine.run({ type: 'nextFile' })
    expect(player.filePlaying()).toEqual({ fileId: 'waves', at: 0, volume: 0.6 })
    await engine.run({ type: 'previousFile' })
    await engine.run({ type: 'previousFile' })

    expect(player.filePlaying()).toEqual({ fileId: 'piano', at: 0, volume: 0.6 })
  })
})

describe('following changes to the music', () => {
  test('the volume of the heard sound changed while it plays changes what plays, which plays on', async () => {
    const { engine, player, changeMusic } = setup()
    await engine.ownersChanged([{ type: 'owner started', owner: pasta }])
    player.playFor(20 * SECOND)

    await changeMusic({ ...pastaOnFocusMix, backgroundSounds: [{ owner: pasta, sound: { playlistId: 'focus-mix', volume: 0.2 } }] })

    expect(player.filePlaying()).toEqual({ fileId: 'rain', at: 20 * SECOND, volume: 0.2 })
  })

  test('a volume of 0 pauses the heard sound, and a volume above 0 plays on from where it paused', async () => {
    const { engine, player, playbackStore, changeMusic } = setup()
    await engine.ownersChanged([{ type: 'owner started', owner: pasta }])
    player.playFor(20 * SECOND)

    await changeMusic({ ...pastaOnFocusMix, backgroundSounds: [{ owner: pasta, sound: { playlistId: 'focus-mix', volume: 0 } }] })
    expect(player.filePlaying()).toBeNull()
    expect(await player.fileCued()).toBeNull()
    expect((await playbackStore.load()).soundPaused).toBe(false)
    await changeMusic({ ...pastaOnFocusMix, backgroundSounds: [{ owner: pasta, sound: { playlistId: 'focus-mix', volume: 0.4 } }] })

    expect(player.filePlaying()).toEqual({ fileId: 'rain', at: 20 * SECOND, volume: 0.4 })
  })

  test('when the file playing is removed from its playlist, the one after it plays from its beginning', async () => {
    const { engine, player, changeMusic } = setup()
    await engine.ownersChanged([{ type: 'owner started', owner: pasta }])
    player.playFor(20 * SECOND)

    await changeMusic({ ...pastaOnFocusMix, playlists: [{ ...focusMix, files: focusMix.files.slice(1) }] })

    expect(player.filePlaying()).toEqual({ fileId: 'waves', at: 0, volume: 0.6 })
  })

  test('a removed playlist that plays stops playing', async () => {
    const { engine, player, changeMusic } = setup()
    await engine.ownersChanged([{ type: 'owner started', owner: pasta }])

    await changeMusic({ playlists: [], backgroundSounds: [{ owner: pasta, sound: { playlistId: null, volume: 0.6 } }] })

    expect(player.filePlaying()).toBeNull()
    expect(await player.fileCued()).toBeNull()
  })
})

describe('a background that starts again', () => {
  test('has the player play the stored sound from its stored place when the player no longer has it, as after the browser closed', async () => {
    const before = setup()
    await before.engine.ownersChanged([{ type: 'owner started', owner: pasta }])
    before.player.playFor(30 * SECOND)
    await before.engine.ownersChanged([{ type: 'owner paused', owner: pasta }])
    await before.engine.ownersChanged([{ type: 'owner resumed', owner: pasta }])
    const player = createMemorySoundPlayer()
    const engine = createPlaybackEngine({ inTurn: createCommandQueue(), musicStore: createMemoryMusicStore(pastaOnFocusMix), playbackStore: before.playbackStore, player })

    await engine.restore(nothingToSettle)

    expect(player.filePlaying()).toEqual({ fileId: 'rain', at: 30 * SECOND, volume: 0.6 })
  })

  test('plays the sound on from the last place the player reported while it played, so at most 15 seconds are heard again', async () => {
    const before = setup()
    await before.engine.ownersChanged([{ type: 'owner started', owner: pasta }])
    before.player.playFor(45 * SECOND)
    await before.engine.placeReported('rain', 45 * SECOND)
    before.player.playFor(10 * SECOND)
    const player = createMemorySoundPlayer()
    const engine = createPlaybackEngine({ inTurn: createCommandQueue(), musicStore: createMemoryMusicStore(pastaOnFocusMix), playbackStore: before.playbackStore, player })

    await engine.restore(nothingToSettle)

    expect(player.filePlaying()).toEqual({ fileId: 'rain', at: 45 * SECOND, volume: 0.6 })
  })

  test('waits until the time the browser was closed is settled before it plays, so a sound owner that finished meanwhile never plays', async () => {
    const before = setup()
    await before.engine.ownersChanged([{ type: 'owner started', owner: pasta }])
    const player = createMemorySoundPlayer()
    const played = vi.spyOn(player, 'playFile')
    const engine = createPlaybackEngine({ inTurn: createCommandQueue(), musicStore: createMemoryMusicStore(pastaOnFocusMix), playbackStore: before.playbackStore, player })
    const settlingFinishesPasta = async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      void engine.ownersChanged([{ type: 'owner finished', owner: pasta }])
    }

    await engine.restore(settlingFinishesPasta)

    expect(played).not.toHaveBeenCalled()
    expect((await before.playbackStore.load()).playing).toBeNull()
  })

  test('settles nothing when no sound is stored, since there is nothing to play again', async () => {
    const { engine } = setup()
    const settle = vi.fn(nothingToSettle)

    await engine.restore(settle)

    expect(settle).not.toHaveBeenCalled()
  })

  test('leaves the player alone when it still has the stored sound cued, so it plays on undisturbed', async () => {
    const { engine, player } = setup()
    await engine.ownersChanged([{ type: 'owner started', owner: pasta }])
    player.playFor(30 * SECOND)

    await engine.restore(nothingToSettle)

    expect(player.filePlaying()).toEqual({ fileId: 'rain', at: 30 * SECOND, volume: 0.6 })
  })
})

describe('a player that fails', () => {
  test('is logged, and the playback is stored as the player was told, so the next instruction starts from there', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const player = { ...createMemorySoundPlayer(), playFile: () => Promise.reject(new Error('No offscreen document')) }
    const playbackStore = createMemoryPlaybackStore()
    const engine = createPlaybackEngine({ inTurn: createCommandQueue(), musicStore: createMemoryMusicStore(pastaOnFocusMix), playbackStore, player })

    await expect(engine.ownersChanged([{ type: 'owner started', owner: pasta }])).resolves.toBeUndefined()

    expect(errors).toHaveBeenCalledOnce()
    expect((await playbackStore.load()).playing).toEqual({ owner: pasta, playlistId: 'focus-mix', fileId: 'rain', from: 0, volume: 0.6 })
  })

  test('that cannot play the stored sound when the background starts again is logged, and starting goes on', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const before = setup()
    await before.engine.ownersChanged([{ type: 'owner started', owner: pasta }])
    const player = { ...createMemorySoundPlayer(), playFile: () => Promise.reject(new Error('No offscreen document')) }
    const engine = createPlaybackEngine({ inTurn: createCommandQueue(), musicStore: createMemoryMusicStore(pastaOnFocusMix), playbackStore: before.playbackStore, player })

    await expect(engine.restore(nothingToSettle)).resolves.toBeUndefined()

    expect(errors).toHaveBeenCalledOnce()
  })
})
