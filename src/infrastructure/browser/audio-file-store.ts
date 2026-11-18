import type { AudioFileData, AudioFileEntry, AudioFileStore } from '@/domain/sound/ports'

const DATABASE = 'glassySession'

/** The files with their bytes, each under its id. */
const FILES = 'audioFiles'

/** The same files without their bytes, under keys that count up in the order they were saved, so listing them reads no content. */
const ENTRIES = 'audioFileEntries'

function done<Result>(request: IDBRequest<Result>): Promise<Result> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function committed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

function removeEntryOf(entries: IDBObjectStore, fileId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const walking = entries.openCursor()
    walking.onsuccess = () => {
      const cursor = walking.result
      if (cursor === null) {
        resolve()
      } else if ((cursor.value as AudioFileEntry).id === fileId) {
        cursor.delete()
        resolve()
      } else {
        cursor.continue()
      }
    }
    walking.onerror = () => reject(walking.error)
  })
}

function openDatabase(): Promise<IDBDatabase> {
  const opening = indexedDB.open(DATABASE, 1)
  opening.onupgradeneeded = () => {
    opening.result.createObjectStore(FILES)
    opening.result.createObjectStore(ENTRIES, { autoIncrement: true })
  }
  return done(opening)
}

/**
 * The person's own audio files in the extension's IndexedDB, which the popup, the background and the offscreen document share.
 * Each call opens the database and closes it again, so no context holds it open.
 */
export function createBrowserAudioFileStore(): AudioFileStore {
  async function inDatabase<Result>(mode: IDBTransactionMode, work: (transaction: IDBTransaction) => Promise<Result>): Promise<Result> {
    const database = await openDatabase()
    try {
      const transaction = database.transaction([FILES, ENTRIES], mode)
      const [result] = await Promise.all([work(transaction), committed(transaction)])
      return result
    } finally {
      database.close()
    }
  }

  return {
    save: (file) => inDatabase('readwrite', async (transaction) => {
      const id = crypto.randomUUID()
      transaction.objectStore(FILES).add({ name: file.name, type: file.type, bytes: file.bytes }, id)
      transaction.objectStore(ENTRIES).add({ id, name: file.name, type: file.type })
      return id
    }),
    read: (fileId) => inDatabase('readonly', async (transaction) => {
      const found: AudioFileData | undefined = await done(transaction.objectStore(FILES).get(fileId))
      return found ?? null
    }),
    remove: (fileId) => inDatabase('readwrite', async (transaction) => {
      transaction.objectStore(FILES).delete(fileId)
      await removeEntryOf(transaction.objectStore(ENTRIES), fileId)
    }),
    list: () => inDatabase('readonly', async (transaction): Promise<readonly AudioFileEntry[]> => done(transaction.objectStore(ENTRIES).getAll()))
  }
}
