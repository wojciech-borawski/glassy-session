import type { Duration } from '@/utils/time/units'
import type { Refusal } from '../command/command-outcome'
import type { CommandQueue } from '../command/command-queue'
import type { SoundPlayer } from '../sound/ports'
import type { SoundCommand } from './commands'
import { soundOf } from './model/background-sound'
import { isSameOwner, playbackAfter, type Cue, type OwnerEvent, type PlaybackEvent, type PlayerInstruction, type SoundLibrary } from './model/playback'
import type { Playlist } from './model/playlist'
import type { MusicStore, PlaybackStore, SavedMusic } from './ports'

type PlaybackEngineDependencies = Readonly<{
  inTurn: CommandQueue
  musicStore: MusicStore
  playbackStore: PlaybackStore
  player: SoundPlayer
}>

/** The playback event each sound command of the person sends. */
export const eventOfSoundCommand: Readonly<Record<SoundCommand['type'], PlaybackEvent>> = {
  pauseSound: { type: 'sound paused' },
  resumeSound: { type: 'sound resumed' },
  nextFile: { type: 'next file' },
  previousFile: { type: 'previous file' }
}

const sameFiles = (one: Playlist, other: Playlist | undefined) =>
  one.files.length === other?.files.length && one.files.every(({ id }, index) => other.files[index]?.id === id)

/** What a music command changed that the playback follows: each playlist whose files changed or that was removed, and each owner whose background sound changed. */
function musicChangesBetween(before: SavedMusic, after: SavedMusic): PlaybackEvent[] {
  const playlistsChanged = before.playlists
    .filter((playlist) => !sameFiles(playlist, after.playlists.find(({ id }) => id === playlist.id)))
    .map((playlist): PlaybackEvent => ({ type: 'playlist changed', before: playlist }))
  const owners = [...before.backgroundSounds, ...after.backgroundSounds]
    .map(({ owner }) => owner)
    .filter((owner, index, all) => all.findIndex((other) => isSameOwner(owner, other)) === index)
  const soundsChanged = owners
    .filter((owner) => {
      const [was, is] = [soundOf(before.backgroundSounds, owner), soundOf(after.backgroundSounds, owner)]
      return was.playlistId !== is.playlistId || was.volume !== is.volume
    })
    .map((owner): PlaybackEvent => ({ type: 'sound changed', owner }))
  return [...playlistsChanged, ...soundsChanged]
}

function libraryOf({ playlists, backgroundSounds }: SavedMusic): SoundLibrary {
  return { playlists, soundOf: (owner) => soundOf(backgroundSounds, owner) }
}

export type PlaybackEngine = ReturnType<typeof createPlaybackEngine>

/**
 * Plays the heard sound on the player as the playback model says, over the stored playback, so nothing is kept between calls.
 * It runs in the queue of the music commands, so the owners' events, the person's sound commands, the player's reports and every
 * change to the music apply one at a time, each report before the next event.
 * The playback is stored before the player is told, and again with the player's report, so a background that stops in between
 * finds what the player was last told. A player that fails is logged, and what made it play goes on.
 */
export function createPlaybackEngine(dependencies: PlaybackEngineDependencies) {
  const { inTurn, musicStore, playbackStore, player } = dependencies

  /** Pauses the cue playing. Gives the player's report of where it paused it, or null when nothing played. */
  async function pausing(playing: Cue | null): Promise<PlaybackEvent | null> {
    const at = playing === null ? null : await player.pauseFile()
    return playing === null || at === null ? null : { type: 'player paused', cue: playing, at }
  }

  /** Has the player do what it is told, given the cue it was playing. Gives the player's report of where it paused that cue, when it paused it. */
  async function carryOut(instruction: PlayerInstruction, playing: Cue | null): Promise<PlaybackEvent | null> {
    switch (instruction.do) {
    case 'play': {
      const report = await pausing(playing)
      const { fileId, from, volume } = instruction.cue
      await player.playFile(fileId, from, volume)
      return report
    }
    case 'pause':
      return pausing(playing)
    case 'stop':
      await player.stopFile()
      return null
    case 'set volume':
      await player.setFileVolume(instruction.volume)
      return null
    case 'nothing':
      return null
    }
  }

  /** Carries out the instruction, logging a player that fails, since a sound that cannot play must not fail what made it play. */
  async function carriedOut(instruction: PlayerInstruction, playing: Cue | null): Promise<PlaybackEvent | null> {
    try {
      return await carryOut(instruction, playing)
    } catch (error) {
      console.error(error)
      return null
    }
  }

  async function applying(events: readonly PlaybackEvent[], music: SavedMusic): Promise<void> {
    const library = libraryOf(music)
    let playback = await playbackStore.load()
    for (const event of events) {
      const change = playbackAfter(playback, event, library)
      const playing = playback.playing
      playback = change.playback
      await playbackStore.save(playback)
      const report = await carriedOut(change.instruction, playing)
      if (report !== null) {
        playback = playbackAfter(playback, report, library).playback
        await playbackStore.save(playback)
      }
    }
  }

  /** Applies the player's report about the file it was told to play. A report about any other file changes nothing. */
  function fileReported(type: 'file ended' | 'file cannot play', fileId: string): Promise<void> {
    return inTurn(async () => {
      const { playing } = await playbackStore.load()
      if (playing?.fileId === fileId) {
        await applying([{ type, cue: playing }], await musicStore.load())
      }
    })
  }

  return {
    ownersChanged(events: readonly OwnerEvent[]): Promise<void> {
      return inTurn(async () => applying(events, await musicStore.load()))
    },
    /** Follows what a music command changed, inside the turn of that command, which runs in the same queue. */
    followMusic(before: SavedMusic, after: SavedMusic): Promise<void> {
      return applying(musicChangesBetween(before, after), after)
    },
    /** Runs a sound command. It is never refused: pausing, resuming or going to another file while no sound is heard changes nothing. */
    run(command: SoundCommand): Promise<Refusal | null> {
      return inTurn(async () => {
        await applying([eventOfSoundCommand[command.type]], await musicStore.load())
        return null
      })
    },
    /**
     * Has the player play the stored sound again from its last stored place when the player no longer has it cued, as after the browser
     * or the offscreen document closed. A player that still has it plays on undisturbed.
     * When a sound is stored, it first waits for `settled`, which settles the timers, focus sessions and alarms up to now, so the sound of an
     * owner that finished while the background was stopped never plays.
     */
    async restore(settled: () => Promise<void>): Promise<void> {
      if ((await playbackStore.load()).playing === null) {
        return
      }
      await settled()
      return inTurn(async () => {
        const { playing } = await playbackStore.load()
        if (playing === null) {
          return
        }
        const cued = await player.fileCued().catch((error: unknown) => {
          console.error(error)
          return null
        })
        if (cued !== playing.fileId) {
          await carriedOut({ do: 'play', cue: playing }, null)
        }
      })
    },
    /** Moves on to the next file when the one that ended is the one the player was told to play. A report about any other file changes nothing. */
    fileEnded: (fileId: string): Promise<void> => fileReported('file ended', fileId),
    /**
     * Moves on to the next file when the one that cannot play is the one the player was told to play, and stops the sound as paused
     * once no file of its playlist could play, one after the other. A report about any other file changes nothing.
     */
    fileCannotPlay: (fileId: string): Promise<void> => fileReported('file cannot play', fileId),
    /**
     * Stores how far into its file the sound playing got, so a background that starts again plays it on from there. It is stored apart
     * from the playback, which tells the player nothing new. A report about any other file changes nothing.
     */
    placeReported(fileId: string, at: Duration): Promise<void> {
      return inTurn(async () => {
        const { playing } = await playbackStore.load()
        if (playing?.fileId === fileId) {
          await playbackStore.savePlace({ cue: playing, at })
        }
      })
    }
  }
}
