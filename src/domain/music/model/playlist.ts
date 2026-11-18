import type { Duration } from '@/utils/time/units'

export type AudioFile = Readonly<{
  id: string
  name: string
  /** How long the file plays, once known. */
  length?: Duration
}>

export type Playlist = Readonly<{
  id: string
  name: string
  files: readonly AudioFile[]
}>

export type NewPlaylist = Omit<Playlist, 'files'>

function checkedName(name: string): string {
  if (name.trim() === '') {
    throw new RangeError('A playlist needs a name')
  }
  return name
}

export function createPlaylist(input: NewPlaylist): Playlist {
  return { ...input, name: checkedName(input.name), files: [] }
}

export function withName(playlist: Playlist, name: string): Playlist {
  return { ...playlist, name: checkedName(name) }
}

export function withFileAdded(playlist: Playlist, file: AudioFile): Playlist {
  if (playlist.files.some(({ id }) => id === file.id)) {
    throw new RangeError(`The file ${file.id} is already in the playlist ${playlist.id}`)
  }
  if (file.name.trim() === '') {
    throw new RangeError('An audio file needs a name')
  }
  if (file.length !== undefined && (!Number.isFinite(file.length) || file.length <= 0)) {
    throw new RangeError(`An audio file needs a positive length, got ${file.length}`)
  }
  return { ...playlist, files: [...playlist.files, file] }
}

export function withFileRemoved(playlist: Playlist, fileId: string): Playlist {
  return { ...playlist, files: playlist.files.filter(({ id }) => id !== fileId) }
}

export function withFileMoved(playlist: Playlist, from: number, to: number): Playlist {
  const isFile = (index: number) => Number.isInteger(index) && index >= 0 && index < playlist.files.length
  if (!isFile(from) || !isFile(to)) {
    return playlist
  }
  const files = [...playlist.files]
  files.splice(to, 0, ...files.splice(from, 1))
  return { ...playlist, files }
}

function fileSteppedFrom(playlist: Playlist, fileId: string, step: 1 | -1): AudioFile | null {
  const { files } = playlist
  const index = files.findIndex(({ id }) => id === fileId)
  if (index === -1) {
    return files[0] ?? null
  }
  return files[(index + step + files.length) % files.length] ?? null
}

export function nextFile(playlist: Playlist, fileId: string): AudioFile | null {
  return fileSteppedFrom(playlist, fileId, 1)
}

export function previousFile(playlist: Playlist, fileId: string): AudioFile | null {
  return fileSteppedFrom(playlist, fileId, -1)
}

export function currentFileAfterChange(before: Playlist, after: Playlist, currentFileId: string): AudioFile | null {
  const index = Math.max(0, before.files.findIndex(({ id }) => id === currentFileId))
  const fromCurrentOn = [...before.files.slice(index), ...before.files.slice(0, index)]
  return fromCurrentOn
    .map((file) => after.files.find(({ id }) => id === file.id))
    .find((file) => file !== undefined) ?? null
}
