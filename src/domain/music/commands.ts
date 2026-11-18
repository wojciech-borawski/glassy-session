import { isRecord } from '@/utils/is-record'
import type { BackgroundSound } from './model/background-sound'
import type { SoundOwner } from './model/playback'
import type { AudioFile, NewPlaylist } from './model/playlist'

export type MusicCommand =
  | Readonly<{ type: 'addPlaylist', playlist: NewPlaylist }>
  | Readonly<{ type: 'renamePlaylist', playlistId: string, name: string }>
  | Readonly<{ type: 'addFiles', playlistId: string, files: readonly AudioFile[] }>
  | Readonly<{ type: 'removeFile', playlistId: string, fileId: string }>
  | Readonly<{ type: 'moveFile', playlistId: string, from: number, to: number }>
  | Readonly<{ type: 'removePlaylist', playlistId: string }>
  | Readonly<{ type: 'chooseBackgroundSound', owner: SoundOwner, sound: BackgroundSound }>
  | Readonly<{ type: 'removeAudioFile', fileId: string }>

/** A request from the popup or the overlay asking the background to pause or resume the heard sound, or to go to its next or previous file. */
export type SoundCommand = Readonly<{ type: 'pauseSound' | 'resumeSound' | 'nextFile' | 'previousFile' }>

const SOUND_COMMAND_TYPES: readonly unknown[] = ['pauseSound', 'resumeSound', 'nextFile', 'previousFile'] satisfies SoundCommand['type'][]

/** Tells a sound command apart from any other message, which may come from anywhere and have any shape. */
export function isSoundCommand(message: unknown): message is SoundCommand {
  return isRecord(message) && SOUND_COMMAND_TYPES.includes(message.type)
}

const OWNER_KINDS: readonly unknown[] = ['timer', 'focus session'] satisfies SoundOwner['of'][]

const isText = (value: unknown): value is string => typeof value === 'string'

const isNumber = (value: unknown): value is number => typeof value === 'number'

function isAudioFile(value: unknown): value is AudioFile {
  return isRecord(value) && isText(value.id) && isText(value.name) && (value.length === undefined || isNumber(value.length))
}

function isSoundOwner(value: unknown): value is SoundOwner {
  return isRecord(value) && OWNER_KINDS.includes(value.of) && isText(value.id)
}

function isBackgroundSound(value: unknown): value is BackgroundSound {
  return isRecord(value) && (value.playlistId === null || isText(value.playlistId)) && isNumber(value.volume)
}

/**
 * Tells a music command apart from any other message, timer, focus session and alarm commands included, which may come from anywhere and have any shape.
 * It checks the shape only. The playlist model still refuses a playlist without a name or a file added twice.
 */
export function isMusicCommand(message: unknown): message is MusicCommand {
  if (!isRecord(message)) {
    return false
  }
  switch (message.type) {
  case 'addPlaylist':
    return isRecord(message.playlist) && isText(message.playlist.id) && isText(message.playlist.name)
  case 'chooseBackgroundSound':
    return isSoundOwner(message.owner) && isBackgroundSound(message.sound)
  case 'removeAudioFile':
    return isText(message.fileId)
  }
  if (!isText(message.playlistId)) {
    return false
  }
  switch (message.type) {
  case 'renamePlaylist':
    return isText(message.name)
  case 'addFiles':
    return Array.isArray(message.files) && message.files.every(isAudioFile)
  case 'removeFile':
    return isText(message.fileId)
  case 'moveFile':
    return isNumber(message.from) && isNumber(message.to)
  default:
    return message.type === 'removePlaylist'
  }
}
