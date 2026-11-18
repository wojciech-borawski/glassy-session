import type { BackgroundSound } from './background-sound'
import { heardOwner, noFileCanPlay, noPlayback, playbackAfter, type Cue, type Playback, type PlaybackEvent, type PlayerInstruction, type SoundLibrary, type SoundOwner } from './playback'
import { withFileMoved, withFileRemoved, type Playlist } from './playlist'

const SECOND = 1000

const focus: Playlist = {
  id: 'focus',
  name: 'Focus',
  files: [{ id: 'rain', name: 'Rain.mp3' }, { id: 'waves', name: 'Waves.ogg' }, { id: 'piano', name: 'Piano.wav' }]
}
const calm: Playlist = { id: 'calm', name: 'Calm', files: [{ id: 'birds', name: 'Birds.mp3' }] }

const pasta: SoundOwner = { of: 'timer', id: 'pasta' }
const tea: SoundOwner = { of: 'timer', id: 'tea' }
const morning: SoundOwner = { of: 'focus session', id: 'morning' }

function library(sounds: readonly (readonly [SoundOwner, BackgroundSound])[], playlists: readonly Playlist[] = [focus]): SoundLibrary {
  return {
    soundOf: (owner) => sounds.find(([{ of, id }]) => of === owner.of && id === owner.id)?.[1] ?? { playlistId: null, volume: 0.5 },
    playlists
  }
}

const pastaOnFocus = library([[pasta, { playlistId: 'focus', volume: 0.6 }]])
const pastaRain: Cue = { owner: pasta, playlistId: 'focus', fileId: 'rain', from: 0, volume: 0.6 }
const pastaWaves: Cue = { ...pastaRain, fileId: 'waves' }
const pastaOnCalm = library([[pasta, { playlistId: 'calm', volume: 0.6 }]], [calm])
const pastaBirds: Cue = { owner: pasta, playlistId: 'calm', fileId: 'birds', from: 0, volume: 0.6 }
const morningOnFocus = library([[morning, { playlistId: 'focus', volume: 0.6 }]])
const morningRain: Cue = { owner: morning, playlistId: 'focus', fileId: 'rain', from: 0, volume: 0.6 }

/** Gives the player instruction of each event, in order. */
function instructionsOf(events: readonly PlaybackEvent[], soundLibrary: SoundLibrary): PlayerInstruction[] {
  let playback = noPlayback
  return events.map((event) => {
    const change = playbackAfter(playback, event, soundLibrary)
    playback = change.playback
    return change.instruction
  })
}

function lastInstructionOf(events: readonly PlaybackEvent[], soundLibrary: SoundLibrary): PlayerInstruction | undefined {
  return instructionsOf(events, soundLibrary).at(-1)
}

function playbackAfterAll(events: readonly PlaybackEvent[], soundLibrary: SoundLibrary): Playback {
  return events.reduce((playback, event) => playbackAfter(playback, event, soundLibrary).playback, noPlayback)
}

describe('starting', () => {
  test('a timer with a playlist that starts plays the first file from the beginning at its volume', () => {
    expect(lastInstructionOf([{ type: 'owner started', owner: pasta }], pastaOnFocus)).toEqual({ do: 'play', cue: pastaRain })
  })

  test('a timer without a playlist that starts plays nothing', () => {
    expect(lastInstructionOf([{ type: 'owner started', owner: pasta }], library([]))).toEqual({ do: 'nothing' })
  })

  test('a timer whose playlist has no files plays nothing', () => {
    const empty: Playlist = { id: 'empty', name: 'Empty', files: [] }

    expect(lastInstructionOf([{ type: 'owner started', owner: pasta }], library([[pasta, { playlistId: 'empty', volume: 0.6 }]], [empty])))
      .toEqual({ do: 'nothing' })
  })

  test('a timer started again after it finished plays its playlist from the first file', () => {
    expect(lastInstructionOf([
      { type: 'owner started', owner: pasta },
      { type: 'file ended', cue: pastaRain },
      { type: 'owner finished', owner: pasta },
      { type: 'owner started', owner: pasta }
    ], pastaOnFocus)).toEqual({ do: 'play', cue: pastaRain })
  })
})

describe('pausing and resuming with the owner', () => {
  test('the background sound pauses when its timer pauses', () => {
    expect(lastInstructionOf([{ type: 'owner started', owner: pasta }, { type: 'owner paused', owner: pasta }], pastaOnFocus)).toEqual({ do: 'pause' })
  })

  test('the background sound resumes with its timer at the place where the player paused', () => {
    expect(lastInstructionOf([
      { type: 'owner started', owner: pasta },
      { type: 'owner paused', owner: pasta },
      { type: 'player paused', cue: pastaRain, at: 40 * SECOND },
      { type: 'owner resumed', owner: pasta }
    ], pastaOnFocus)).toEqual({ do: 'play', cue: { ...pastaRain, from: 40 * SECOND } })
  })

  test('the background sound resumes with its timer in the file it was paused in', () => {
    expect(lastInstructionOf([
      { type: 'owner started', owner: pasta },
      { type: 'file ended', cue: pastaRain },
      { type: 'owner paused', owner: pasta },
      { type: 'player paused', cue: pastaWaves, at: 40 * SECOND },
      { type: 'owner resumed', owner: pasta }
    ], pastaOnFocus)).toEqual({ do: 'play', cue: { ...pastaWaves, from: 40 * SECOND } })
  })
})

describe('finishing', () => {
  test('the background sound stops when its timer finishes', () => {
    expect(lastInstructionOf([{ type: 'owner started', owner: pasta }, { type: 'owner finished', owner: pasta }], pastaOnFocus)).toEqual({ do: 'stop' })
  })
})

describe('going through the playlist', () => {
  test('when a file ends, the next file plays from its beginning', () => {
    expect(lastInstructionOf([{ type: 'owner started', owner: pasta }, { type: 'file ended', cue: pastaRain }], pastaOnFocus))
      .toEqual({ do: 'play', cue: pastaWaves })
  })

  test('going to the next file plays it from its beginning', () => {
    expect(lastInstructionOf([{ type: 'owner started', owner: pasta }, { type: 'next file' }], pastaOnFocus)).toEqual({ do: 'play', cue: pastaWaves })
  })

  test('going to the previous file plays it from its beginning', () => {
    expect(lastInstructionOf([{ type: 'owner started', owner: pasta }, { type: 'previous file' }], pastaOnFocus))
      .toEqual({ do: 'play', cue: { ...pastaRain, fileId: 'piano' } })
  })

  test('a playlist with one file plays it again from its beginning when it ends', () => {
    expect(lastInstructionOf([{ type: 'owner started', owner: pasta }, { type: 'file ended', cue: pastaBirds }], pastaOnCalm))
      .toEqual({ do: 'play', cue: pastaBirds })
  })

  test('going to the next file of a playlist with one file plays it again from its beginning', () => {
    expect(lastInstructionOf([{ type: 'owner started', owner: pasta }, { type: 'next file' }], pastaOnCalm)).toEqual({ do: 'play', cue: pastaBirds })
  })

  test('a report of where the player paused a file that is no longer current changes nothing', () => {
    expect(lastInstructionOf([
      { type: 'owner started', owner: pasta },
      { type: 'next file' },
      { type: 'player paused', cue: pastaRain, at: 30 * SECOND },
      { type: 'owner paused', owner: pasta },
      { type: 'owner resumed', owner: pasta }
    ], pastaOnFocus)).toEqual({ do: 'play', cue: pastaWaves })
  })

  test('a place the player reports while the file plays is kept without disturbing the player, and the cue starts from there', () => {
    const playing = playbackAfterAll([{ type: 'owner started', owner: pasta }], pastaOnFocus)

    const placed = playbackAfter(playing, { type: 'place reported', cue: pastaRain, at: 30 * SECOND }, pastaOnFocus)

    expect(placed.instruction).toEqual({ do: 'nothing' })
    expect(placed.playback.playing).toEqual({ ...pastaRain, from: 30 * SECOND })
    expect(playbackAfter(placed.playback, { type: 'sound changed', owner: pasta }, library([[pasta, { playlistId: 'focus', volume: 0.3 }]])).instruction)
      .toEqual({ do: 'set volume', volume: 0.3 })
  })

  test('a report of a place in a file that is no longer playing changes nothing', () => {
    const playingWaves = playbackAfterAll([{ type: 'owner started', owner: pasta }, { type: 'file ended', cue: pastaRain }], pastaOnFocus)

    expect(playbackAfter(playingWaves, { type: 'place reported', cue: pastaRain, at: 30 * SECOND }, pastaOnFocus)).toEqual({ playback: playingWaves, instruction: { do: 'nothing' } })
  })

  test('a report that a file ended which is no longer playing changes nothing', () => {
    expect(lastInstructionOf([
      { type: 'owner started', owner: pasta },
      { type: 'file ended', cue: pastaRain },
      { type: 'file ended', cue: pastaRain }
    ], pastaOnFocus)).toEqual({ do: 'nothing' })
  })
})

describe('files that cannot play', () => {
  const pastaPiano: Cue = { ...pastaRain, fileId: 'piano' }

  test('when a file cannot play, the next file plays from its beginning', () => {
    expect(lastInstructionOf([{ type: 'owner started', owner: pasta }, { type: 'file cannot play', cue: pastaRain }], pastaOnFocus))
      .toEqual({ do: 'play', cue: pastaWaves })
  })

  test('when no file of the playlist can play, one after the other, the sound stops as paused instead of going round', () => {
    const events: PlaybackEvent[] = [
      { type: 'owner started', owner: pasta },
      { type: 'file cannot play', cue: pastaRain },
      { type: 'file cannot play', cue: pastaWaves },
      { type: 'file cannot play', cue: pastaPiano }
    ]

    expect(lastInstructionOf(events, pastaOnFocus)).toEqual({ do: 'pause' })
    expect(playbackAfterAll(events, pastaOnFocus)).toMatchObject({ soundPaused: true, playing: null })
    expect(heardOwner(playbackAfterAll(events, pastaOnFocus), pastaOnFocus)).toEqual(pasta)
  })

  test('a sound that stopped as no file of its playlist can play says so while it stays paused', () => {
    const stopped = playbackAfterAll([
      { type: 'owner started', owner: tea },
      { type: 'owner started', owner: pasta },
      { type: 'file cannot play', cue: pastaRain },
      { type: 'file cannot play', cue: pastaWaves },
      { type: 'file cannot play', cue: pastaPiano },
      { type: 'player paused', cue: pastaPiano, at: 0 },
      { type: 'owner paused', owner: tea }
    ], pastaOnFocus)

    expect(stopped.soundPaused).toBe(true)
    expect(noFileCanPlay(stopped, pastaOnFocus)).toBe(true)
  })

  test('resuming a sound that stopped as no file could play tries its files again, counting from none', () => {
    const events: PlaybackEvent[] = [
      { type: 'owner started', owner: pasta },
      { type: 'file cannot play', cue: pastaRain },
      { type: 'file cannot play', cue: pastaWaves },
      { type: 'file cannot play', cue: pastaPiano },
      { type: 'sound resumed' },
      { type: 'file cannot play', cue: { ...pastaPiano, from: 0 } }
    ]

    expect(instructionsOf(events, pastaOnFocus).slice(-2)).toEqual([{ do: 'play', cue: pastaPiano }, { do: 'play', cue: pastaRain }])
    expect(noFileCanPlay(playbackAfterAll(events, pastaOnFocus), pastaOnFocus)).toBe(false)
  })

  test('a file that played to its end since counts the files that cannot play from none, so the sound plays on', () => {
    expect(lastInstructionOf([
      { type: 'owner started', owner: pasta },
      { type: 'file cannot play', cue: pastaRain },
      { type: 'file cannot play', cue: pastaWaves },
      { type: 'file ended', cue: pastaPiano },
      { type: 'file ended', cue: pastaRain },
      { type: 'file ended', cue: pastaWaves },
      { type: 'file cannot play', cue: pastaPiano }
    ], pastaOnFocus)).toEqual({ do: 'play', cue: pastaRain })
  })

  test('a sound the person paused does not say that no file can play', () => {
    const paused = playbackAfterAll([{ type: 'owner started', owner: pasta }, { type: 'sound paused' }], pastaOnFocus)

    expect(noFileCanPlay(paused, pastaOnFocus)).toBe(false)
  })
})

describe('the person pausing the background sound', () => {
  test('the person can pause the background sound while its timer keeps running', () => {
    expect(lastInstructionOf([{ type: 'owner started', owner: pasta }, { type: 'sound paused' }], pastaOnFocus)).toEqual({ do: 'pause' })
  })

  test('the person can resume the background sound at the place where it paused', () => {
    expect(lastInstructionOf([
      { type: 'owner started', owner: pasta },
      { type: 'sound paused' },
      { type: 'player paused', cue: pastaRain, at: 25 * SECOND },
      { type: 'sound resumed' }
    ], pastaOnFocus)).toEqual({ do: 'play', cue: { ...pastaRain, from: 25 * SECOND } })
  })

  test('going to the next file while the person paused the sound plays it once the sound resumes', () => {
    expect(instructionsOf([
      { type: 'owner started', owner: pasta },
      { type: 'sound paused' },
      { type: 'next file' },
      { type: 'sound resumed' }
    ], pastaOnFocus).slice(2)).toEqual([{ do: 'nothing' }, { do: 'play', cue: pastaWaves }])
  })

  test('pausing the sound when none is heard changes nothing', () => {
    expect(lastInstructionOf([
      { type: 'owner started', owner: pasta },
      { type: 'owner paused', owner: pasta },
      { type: 'sound paused' },
      { type: 'owner resumed', owner: pasta }
    ], pastaOnFocus)).toEqual({ do: 'play', cue: pastaRain })
  })

  test('the person\'s pause survives its timer pausing and resuming', () => {
    expect(instructionsOf([
      { type: 'owner started', owner: pasta },
      { type: 'sound paused' },
      { type: 'owner paused', owner: pasta },
      { type: 'owner resumed', owner: pasta }
    ], pastaOnFocus).slice(2)).toEqual([{ do: 'nothing' }, { do: 'nothing' }])
  })
})

describe('the person\'s pause coming back by itself', () => {
  test('a background sound the person left paused comes back at the next break', () => {
    expect(lastInstructionOf([{ type: 'owner started', owner: morning }, { type: 'sound paused' }, { type: 'break started' }], morningOnFocus))
      .toEqual({ do: 'play', cue: morningRain })
  })

  test('a background sound the person left paused comes back when the next timer starts', () => {
    expect(lastInstructionOf([{ type: 'owner started', owner: morning }, { type: 'sound paused' }, { type: 'owner started', owner: tea }], morningOnFocus))
      .toEqual({ do: 'play', cue: morningRain })
  })

  test('the person\'s pause survives a volume change but not the next break', () => {
    const louder = library([[morning, { playlistId: 'focus', volume: 0.9 }]])
    const paused = playbackAfterAll([{ type: 'owner started', owner: morning }, { type: 'sound paused' }], morningOnFocus)

    const afterVolumeChange = playbackAfter(paused, { type: 'sound changed', owner: morning }, louder)

    expect(afterVolumeChange.instruction).toEqual({ do: 'nothing' })
    expect(playbackAfter(afterVolumeChange.playback, { type: 'break started' }, louder).instruction)
      .toEqual({ do: 'play', cue: { ...morningRain, volume: 0.9 } })
  })

  test('a background sound the person left paused comes back at the next focus step', () => {
    expect(lastInstructionOf([{ type: 'owner started', owner: morning }, { type: 'sound paused' }, { type: 'focus step started' }], morningOnFocus))
      .toEqual({ do: 'play', cue: morningRain })
  })
})

describe('several timers and focus sessions running at once', () => {
  const sounds = library([
    [morning, { playlistId: 'focus', volume: 0.6 }],
    [pasta, { playlistId: 'calm', volume: 0.4 }],
    [tea, { playlistId: 'calm', volume: 0.8 }]
  ], [focus, calm])
  const pastaQuietBirds = { ...pastaBirds, volume: 0.4 }

  test('only the background sound of the one started most recently is heard', () => {
    expect(lastInstructionOf([{ type: 'owner started', owner: morning }, { type: 'owner started', owner: pasta }], sounds))
      .toEqual({ do: 'play', cue: pastaQuietBirds })
  })

  test('a second timer that starts while the first plays and then pauses hands the sound back at its place', () => {
    expect(instructionsOf([
      { type: 'owner started', owner: morning },
      { type: 'owner started', owner: pasta },
      { type: 'player paused', cue: morningRain, at: 40 * SECOND },
      { type: 'owner paused', owner: pasta }
    ], sounds)).toEqual([
      { do: 'play', cue: morningRain },
      { do: 'play', cue: pastaQuietBirds },
      { do: 'nothing' },
      { do: 'play', cue: { ...morningRain, from: 40 * SECOND } }
    ])
  })

  test('when the heard one pauses, the sound of the most recently started one still running takes over', () => {
    expect(lastInstructionOf([
      { type: 'owner started', owner: morning },
      { type: 'owner started', owner: pasta },
      { type: 'owner started', owner: tea },
      { type: 'owner paused', owner: tea }
    ], sounds)).toEqual({ do: 'play', cue: pastaQuietBirds })
  })

  test('when the heard one finishes, the sound of the most recently started one still running takes over', () => {
    expect(lastInstructionOf([
      { type: 'owner started', owner: morning },
      { type: 'owner started', owner: pasta },
      { type: 'owner finished', owner: pasta }
    ], sounds)).toEqual({ do: 'play', cue: morningRain })
  })

  test('a resumed one is heard over one started before it resumed', () => {
    expect(lastInstructionOf([
      { type: 'owner started', owner: morning },
      { type: 'owner paused', owner: morning },
      { type: 'owner started', owner: pasta },
      { type: 'owner resumed', owner: morning }
    ], sounds)).toEqual({ do: 'play', cue: morningRain })
  })

  test('a paused one that is not heard pauses nothing', () => {
    expect(lastInstructionOf([
      { type: 'owner started', owner: morning },
      { type: 'owner started', owner: pasta },
      { type: 'owner paused', owner: morning }
    ], sounds)).toEqual({ do: 'nothing' })
  })

  test('a timer without a playlist that starts leaves the heard sound playing', () => {
    expect(lastInstructionOf([{ type: 'owner started', owner: morning }, { type: 'owner started', owner: tea }], morningOnFocus)).toEqual({ do: 'nothing' })
  })
})

describe('changing the background sound', () => {
  test('a volume changed while the sound plays reaches the player without restarting the file', () => {
    const playing = playbackAfterAll([{ type: 'owner started', owner: pasta }], pastaOnFocus)

    expect(playbackAfter(playing, { type: 'sound changed', owner: pasta }, library([[pasta, { playlistId: 'focus', volume: 0.3 }]])).instruction)
      .toEqual({ do: 'set volume', volume: 0.3 })
  })

  test('a volume of 0 pauses the player and keeps the place, without counting as the person pausing the sound', () => {
    const playing = playbackAfterAll([{ type: 'owner started', owner: pasta }], pastaOnFocus)

    const silent = playbackAfter(playing, { type: 'sound changed', owner: pasta }, library([[pasta, { playlistId: 'focus', volume: 0 }]]))

    expect(silent.instruction).toEqual({ do: 'pause' })
    expect(silent.playback.soundPaused).toBe(false)
  })

  test('a volume raised above 0 plays on from the place where the player paused at volume 0', () => {
    const silentPasta = library([[pasta, { playlistId: 'focus', volume: 0 }]])
    const playing = playbackAfterAll([{ type: 'owner started', owner: pasta }], pastaOnFocus)
    const silent = playbackAfter(playing, { type: 'sound changed', owner: pasta }, silentPasta).playback
    const placed = playbackAfter(silent, { type: 'player paused', cue: pastaRain, at: 40 * SECOND }, silentPasta).playback

    expect(playbackAfter(placed, { type: 'sound changed', owner: pasta }, library([[pasta, { playlistId: 'focus', volume: 0.3 }]])).instruction)
      .toEqual({ do: 'play', cue: { ...pastaRain, from: 40 * SECOND, volume: 0.3 } })
  })

  test('a sound at volume 0 plays nothing when its owner starts, and a break does not bring it back', () => {
    const silentPasta = library([[pasta, { playlistId: 'focus', volume: 0 }]])

    expect(instructionsOf([{ type: 'owner started', owner: pasta }, { type: 'break started' }], silentPasta)).toEqual([{ do: 'nothing' }, { do: 'nothing' }])
  })

  test('a playlist chosen while the sound plays starts with its first file', () => {
    const onFocus = library([[pasta, { playlistId: 'focus', volume: 0.6 }]], [focus, calm])
    const playingWaves = playbackAfterAll([{ type: 'owner started', owner: pasta }, { type: 'file ended', cue: pastaRain }], onFocus)

    expect(playbackAfter(playingWaves, { type: 'sound changed', owner: pasta }, library([[pasta, { playlistId: 'calm', volume: 0.6 }]], [focus, calm])).instruction)
      .toEqual({ do: 'play', cue: pastaBirds })
  })

  test('a sound whose playlist was removed while it plays stops', () => {
    const playing = playbackAfterAll([{ type: 'owner started', owner: pasta }], pastaOnFocus)

    expect(playbackAfter(playing, { type: 'sound changed', owner: pasta }, library([[pasta, { playlistId: null, volume: 0.6 }]], [])).instruction)
      .toEqual({ do: 'stop' })
  })
})

describe('changing a playlist that is playing', () => {
  test('when the playing file is removed, the file that followed it plays from its beginning', () => {
    const playing = playbackAfterAll([{ type: 'owner started', owner: pasta }], pastaOnFocus)
    const withoutRain = library([[pasta, { playlistId: 'focus', volume: 0.6 }]], [withFileRemoved(focus, 'rain')])

    expect(playbackAfter(playing, { type: 'playlist changed', before: focus }, withoutRain).instruction).toEqual({ do: 'play', cue: pastaWaves })
  })

  test('moving the playing file leaves it playing', () => {
    const playing = playbackAfterAll([
      { type: 'owner started', owner: pasta },
      { type: 'owner paused', owner: pasta },
      { type: 'player paused', cue: pastaRain, at: 40 * SECOND },
      { type: 'owner resumed', owner: pasta }
    ], pastaOnFocus)
    const rainLast = library([[pasta, { playlistId: 'focus', volume: 0.6 }]], [withFileMoved(focus, 0, 2)])

    expect(playbackAfter(playing, { type: 'playlist changed', before: focus }, rainLast).instruction).toEqual({ do: 'nothing' })
  })

  test('removing the only file of the playing playlist stops the sound', () => {
    const playing = playbackAfterAll([{ type: 'owner started', owner: pasta }], pastaOnCalm)
    const emptied = library([[pasta, { playlistId: 'calm', volume: 0.6 }]], [withFileRemoved(calm, 'birds')])

    expect(playbackAfter(playing, { type: 'playlist changed', before: calm }, emptied).instruction).toEqual({ do: 'stop' })
  })
})

describe('the heard owner', () => {
  test('is the owner whose sound plays, and stays so while the person paused the sound', () => {
    const both = library([[pasta, { playlistId: 'focus', volume: 0.6 }], [tea, { playlistId: 'focus', volume: 0.3 }]])
    const started = playbackAfterAll([{ type: 'owner started', owner: tea }, { type: 'owner started', owner: pasta }], both)

    expect(heardOwner(started, both)).toEqual(pasta)
    expect(heardOwner(playbackAfter(started, { type: 'sound paused' }, both).playback, both)).toEqual(pasta)
  })

  test('is none when no running owner has a playlist with files', () => {
    expect(heardOwner(playbackAfterAll([{ type: 'owner started', owner: pasta }, { type: 'owner paused', owner: pasta }], pastaOnFocus), pastaOnFocus)).toBeNull()
    expect(heardOwner(playbackAfterAll([{ type: 'owner started', owner: tea }], pastaOnFocus), pastaOnFocus)).toBeNull()
  })
})
