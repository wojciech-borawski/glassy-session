import { useSnackbar } from '@/ui/n-snackbar/snackbar'
import { failure, type Refusal } from '../command/command-outcome'
import { whyRefused } from '../command/why-refused'
import type { AudioFileEntry } from '../sound/ports'
import type { MusicCommand } from './commands'
import type { BackgroundSound } from './model/background-sound'
import type { SoundOwner } from './model/playback'
import type { AudioFile, Playlist } from './model/playlist'
import { useStoredPlaylists } from './stored-playlists'

/** How many timers and focus sessions chose a playlist, and lose it when it is deleted. */
type LostBy = Readonly<{ timers: number, focusSessions: number }>

/** Sends music commands through the stored playlists and says in the snackbar what each one did, or why it did nothing. */
export function useMusicCommands() {
  const { playlists, send, keepFile } = useStoredPlaylists()
  const { show } = useSnackbar()
  const { t } = useI18n()

  async function run(command: MusicCommand, done: string): Promise<Refusal | null> {
    const refusal = await send(command)
    show(refusal === null ? done : whyRefused(refusal, t))
    return refusal
  }

  /** Keeps each picked file that is audio, says which ones are not, and adds the kept ones to the playlist in the order picked. */
  async function addFiles(playlist: Playlist, picked: readonly File[]): Promise<Refusal | null> {
    const kept: AudioFile[] = []
    for (const file of picked) {
      let audioFile: AudioFile | null
      try {
        audioFile = await keepFile(file)
      } catch (error) {
        const refusal = failure(error)
        show(whyRefused(refusal, t))
        return refusal
      }
      if (audioFile === null) {
        show(t('musicCommand.notAudio', { file: file.name }))
      } else {
        kept.push(audioFile)
      }
    }
    if (kept.length === 0) {
      return null
    }
    return run({ type: 'addFiles', playlistId: playlist.id, files: kept }, t('musicCommand.filesAdded', { name: playlist.name }, kept.length))
  }

  /** What the snackbar says once a playlist is deleted, counting the timers and focus sessions that chose it. */
  function deleted(playlist: Playlist, { timers, focusSessions }: LostBy): string {
    const counted = [
      ...timers > 0 ? [t('musicCommand.timers', { n: timers }, timers)] : [],
      ...focusSessions > 0 ? [t('musicCommand.focusSessions', { n: focusSessions }, focusSessions)] : []
    ]
    return counted.length === 0
      ? t('musicCommand.removed', { name: playlist.name })
      : t('musicCommand.removedLosing', { name: playlist.name, lost: counted.join(t('musicCommand.and')) }, timers + focusSessions)
  }

  function chosen(ownerName: string, sound: BackgroundSound): string {
    const playlist = playlists.value.find(({ id }) => id === sound.playlistId)
    return playlist === undefined
      ? t('musicCommand.soundNone', { name: ownerName })
      : t('musicCommand.soundChosen', { name: ownerName, playlist: playlist.name, volume: Math.round(sound.volume * 100) })
  }

  return {
    chooseSound: (owner: SoundOwner, ownerName: string, sound: BackgroundSound) =>
      run({ type: 'chooseBackgroundSound', owner, sound }, chosen(ownerName, sound)),
    /** Deletes the playlist. `lostBy` counts the timers and focus sessions that chose it, which the snackbar names. */
    remove: (playlist: Playlist, lostBy: LostBy) => run({ type: 'removePlaylist', playlistId: playlist.id }, deleted(playlist, lostBy)),
    addFiles,
    add: (name: string) => run({ type: 'addPlaylist', playlist: { id: crypto.randomUUID(), name } }, t('musicCommand.added', { name })),
    rename: (playlist: Playlist, name: string) =>
      run({ type: 'renamePlaylist', playlistId: playlist.id, name }, t('musicCommand.renamed', { before: playlist.name, name })),
    removeFile: (playlist: Playlist, file: AudioFile) =>
      run({ type: 'removeFile', playlistId: playlist.id, fileId: file.id }, t('musicCommand.fileRemoved', { file: file.name, name: playlist.name })),
    /** Forgets one of the person's own audio files, which the background refuses, naming them, while a ring sound, a chime or a playlist plays it. */
    removeAudioFile: (file: AudioFileEntry) => run({ type: 'removeAudioFile', fileId: file.id }, t('musicCommand.audioFileRemoved', { file: file.name })),
    moveFile: (playlist: Playlist, from: number, to: number) =>
      run({ type: 'moveFile', playlistId: playlist.id, from, to }, t('musicCommand.fileMoved', { file: playlist.files[from]?.name ?? '', place: to + 1, name: playlist.name }))
  }
}
