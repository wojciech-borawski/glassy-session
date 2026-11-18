import { IDBFactory } from 'fake-indexeddb'
import type { AudioFileStore } from '@/domain/sound/ports'
import { createMemoryAudioFileStore } from '../memory/audio-file-store'
import { createBrowserAudioFileStore } from './audio-file-store'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

const bytesOf = (...values: number[]) => new Uint8Array(values).buffer

const rain = { name: 'rain.mp3', type: 'audio/mpeg', bytes: bytesOf(1, 2, 3) }

describe.each([
  ['in IndexedDB', createBrowserAudioFileStore],
  ['in memory', createMemoryAudioFileStore]
])('the audio files kept %s', (_where, createStore: () => AudioFileStore) => {
  test('a saved file reads back with its name, type and bytes', async () => {
    const store = createStore()

    const id = await store.save(rain)

    expect(await store.read(id)).toEqual(rain)
  })

  test('the list gives the kept files without their bytes, in the order they were saved', async () => {
    const store = createStore()
    const names = ['waves.ogg', 'birds.wav', 'rain.mp3', 'piano.flac']
    const ids: string[] = []

    for (const name of names) {
      ids.push(await store.save({ ...rain, name }))
    }

    expect(await store.list()).toEqual(names.map((name, index) => ({ id: ids[index], name, type: 'audio/mpeg' })))
  })

  test('a removed file is no longer read or listed, and the others stay', async () => {
    const store = createStore()
    const rainId = await store.save(rain)
    const wavesId = await store.save({ ...rain, name: 'waves.ogg' })

    await store.remove(rainId)

    expect(await store.read(rainId)).toBeNull()
    expect(await store.list()).toEqual([{ id: wavesId, name: 'waves.ogg', type: 'audio/mpeg' }])
  })
})

test('an audio file saved in the popup is read where the sound plays, by a store of its own', async () => {
  const id = await createBrowserAudioFileStore().save(rain)

  expect(await createBrowserAudioFileStore().read(id)).toEqual(rain)
})
