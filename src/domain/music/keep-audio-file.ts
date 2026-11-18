import type { Duration } from '@/utils/time/units'
import type { AudioFileStore } from '../sound/ports'
import type { AudioFile } from './model/playlist'

/** Tells how long a file plays: undefined for audio whose length cannot be told, null for a file that is not audio. */
export type AudioLengthReader = (file: Blob) => Promise<Duration | undefined | null>

/**
 * Keeps a file the person picked for a playlist in the one store of their own audio files, so rings and chimes can use it too.
 * Resolves with the file as a playlist lists it, or with null and keeps nothing when it is not audio.
 */
export async function keepAudioFile(file: File, audioFiles: AudioFileStore, lengthOf: AudioLengthReader): Promise<AudioFile | null> {
  const length = await lengthOf(file)
  if (length === null) {
    return null
  }
  const id = await audioFiles.save({ name: file.name, type: file.type, bytes: await file.arrayBuffer() })
  return { id, name: file.name, ...length === undefined ? {} : { length } }
}
