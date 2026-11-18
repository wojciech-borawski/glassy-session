import type { Refusal } from '../command/command-outcome'
import type { CommandQueue } from '../command/command-queue'
import { usersOfAudioFile, type SoundUse } from '../sound/model/sound-use'
import type { AudioFileStore } from '../sound/ports'
import type { MusicCommand } from './commands'
import { withoutRemovedPlaylist, withoutSoundOf, withSoundChosen, withVolume } from './model/background-sound'
import type { SoundOwner } from './model/playback'
import { createPlaylist, withFileAdded, withFileMoved, withFileRemoved, withName, type Playlist } from './model/playlist'
import type { MusicStore, SavedMusic } from './ports'

type MusicEngineDependencies = Readonly<{
  inTurn: CommandQueue
  musicStore: MusicStore
  audioFiles: AudioFileStore
  /** The ring sounds of the stored timers and alarms and the chosen chimes, with what plays each, so their own audio files stay kept. */
  soundUses(): Promise<readonly SoundUse[]>
  /** Follows what each command changed, given the music before and after it, inside the turn of the command. Defaults to following nothing. */
  followMusic?(before: SavedMusic, after: SavedMusic): Promise<void>
}>

export type MusicEngine = ReturnType<typeof createMusicEngine>

const alreadyRemoved: Refusal = { reason: 'already removed' }

const fileIdsOf = ({ playlists }: SavedMusic) => playlists.flatMap(({ files }) => files.map(({ id }) => id))

const playlistUses = ({ playlists }: SavedMusic): SoundUse[] =>
  playlists.flatMap(({ name, files }) => files.map(({ id }) => ({ sound: { kind: 'audio file', fileId: id }, by: { kind: 'playlist', name } })))

type PlaylistCommand = Exclude<MusicCommand, Readonly<{ type: 'removeAudioFile' }>>

/**
 * Runs the music commands the background gets, each in turn, over the stored playlists and background sounds, so nothing is kept between calls.
 * A command for a playlist id that is not stored, or a background sound choosing one, is refused as already removed. Adding a playlist whose id is already stored changes nothing.
 * Removing a playlist leaves every timer and focus session that chose it with none, at the volume it had.
 * After the save it forgets the bytes of each file that no playlist lists any more and no ring sound or chime uses, so a worker that stops in between keeps bytes nobody lists rather than listing bytes that are gone.
 * Removing one of the person's own audio files forgets its bytes, and is refused, naming each of them, while a playlist, a ring sound or a chime still plays it.
 */
export function createMusicEngine(dependencies: MusicEngineDependencies) {
  const { inTurn, musicStore, audioFiles, soundUses, followMusic = async () => {} } = dependencies

  /** Forgets the bytes of each of the files that no playlist in the music lists and no ring sound or chime plays. */
  async function forgetUnlisted(fileIds: readonly string[], saved: SavedMusic): Promise<void> {
    if (fileIds.length === 0) {
      return
    }
    const used = new Set([...await soundUses(), ...playlistUses(saved)].flatMap(({ sound }) => sound.kind === 'audio file' ? [sound.fileId] : []))
    for (const fileId of fileIds) {
      if (!used.has(fileId)) {
        await audioFiles.remove(fileId)
      }
    }
  }

  async function removeAudioFile(fileId: string): Promise<Refusal | null> {
    const usedBy = usersOfAudioFile([...await soundUses(), ...playlistUses(await musicStore.load())], fileId)
    if (usedBy.length > 0) {
      return { reason: 'audio file in use', usedBy }
    }
    await audioFiles.remove(fileId)
    return null
  }

  function changed(saved: SavedMusic, command: PlaylistCommand): SavedMusic | Refusal {
    const isStored = (playlistId: string) => saved.playlists.some(({ id }) => id === playlistId)
    const changeOne = (playlistId: string, change: (playlist: Playlist) => Playlist) =>
      isStored(playlistId)
        ? { ...saved, playlists: saved.playlists.map((playlist) => playlist.id === playlistId ? change(playlist) : playlist) }
        : alreadyRemoved
    switch (command.type) {
    case 'addPlaylist':
      return isStored(command.playlist.id)
        ? saved
        : { ...saved, playlists: [...saved.playlists, createPlaylist(command.playlist)] }
    case 'renamePlaylist':
      return changeOne(command.playlistId, (playlist) => withName(playlist, command.name))
    case 'addFiles':
      return changeOne(command.playlistId, (playlist) => command.files.reduce(withFileAdded, playlist))
    case 'removeFile':
      return changeOne(command.playlistId, (playlist) => withFileRemoved(playlist, command.fileId))
    case 'moveFile':
      return changeOne(command.playlistId, (playlist) => withFileMoved(playlist, command.from, command.to))
    case 'removePlaylist':
      return isStored(command.playlistId)
        ? {
          playlists: saved.playlists.filter(({ id }) => id !== command.playlistId),
          backgroundSounds: saved.backgroundSounds.map(({ owner, sound }) => ({ owner, sound: withoutRemovedPlaylist(sound, command.playlistId) }))
        }
        : alreadyRemoved
    case 'chooseBackgroundSound':
      return command.sound.playlistId !== null && !isStored(command.sound.playlistId)
        ? alreadyRemoved
        : { ...saved, backgroundSounds: withSoundChosen(saved.backgroundSounds, command.owner, withVolume(command.sound, command.sound.volume)) }
    }
  }

  function run(command: MusicCommand): Promise<Refusal | null> {
    return inTurn(async () => {
      if (command.type === 'removeAudioFile') {
        return removeAudioFile(command.fileId)
      }
      const loaded = await musicStore.load()
      const after = changed(loaded, command)
      if ('reason' in after) {
        return after
      }
      await musicStore.save(after)
      await followMusic(loaded, after)
      const listed = new Set(fileIdsOf(after))
      await forgetUnlisted(fileIdsOf(loaded).filter((fileId) => !listed.has(fileId)), after)
      return null
    })
  }

  /** Forgets the bytes of each of the files a ring sound or a chime let go of, in turn with the commands, unless a playlist lists it or something else still plays it. */
  function forgetUnusedFiles(fileIds: readonly string[]): Promise<void> {
    return inTurn(async () => forgetUnlisted(fileIds, await musicStore.load()))
  }

  /** Takes away the background sound of a timer or focus session that was removed, in turn with the commands. */
  function forgetSoundOf(owner: SoundOwner): Promise<void> {
    return inTurn(async () => {
      const loaded = await musicStore.load()
      await musicStore.save({ ...loaded, backgroundSounds: withoutSoundOf(loaded.backgroundSounds, owner) })
    })
  }

  return { run, forgetSoundOf, forgetUnusedFiles }
}
