import type { AudioFileData, AudioFileEntry, AudioFileStore } from '@/domain/sound/ports'

/**
 * Audio files kept in memory, in the order they were saved, given ids that count up from 1.
 * It starts with the files given, kept under their own ids with no content.
 */
export function createMemoryAudioFileStore(kept: readonly AudioFileEntry[] = []): AudioFileStore {
  const files = new Map<string, AudioFileData>(kept.map(({ id, name, type }) => [id, { name, type, bytes: new ArrayBuffer(0) }]))
  let lastId = 0
  return {
    async save(file) {
      const id = String(++lastId)
      files.set(id, file)
      return id
    },
    async read(fileId) {
      return files.get(fileId) ?? null
    },
    async remove(fileId) {
      files.delete(fileId)
    },
    async list() {
      return [...files].map(([id, { name, type }]) => ({ id, name, type }))
    }
  }
}
