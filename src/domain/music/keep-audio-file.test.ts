import { createMemoryAudioFileStore } from '@/infrastructure/memory/audio-file-store'
import { keepAudioFile } from './keep-audio-file'

describe('keeping a picked file for a playlist', () => {
  test('an audio file is kept once with its name, type and content, under the id the playlist lists it by', async () => {
    const audioFiles = createMemoryAudioFileStore()
    const picked = new File([new Uint8Array([1, 2, 3])], 'rain.mp3', { type: 'audio/mpeg' })

    const kept = await keepAudioFile(picked, audioFiles, async () => 180_000)

    expect(kept).toEqual({ id: expect.any(String), name: 'rain.mp3', length: 180_000 })
    const read = await audioFiles.read(kept!.id)
    expect(read).toEqual({ name: 'rain.mp3', type: 'audio/mpeg', bytes: expect.any(ArrayBuffer) })
    expect([...new Uint8Array(read!.bytes)]).toEqual([1, 2, 3])
    expect(await audioFiles.list()).toHaveLength(1)
  })

  test('an audio file whose length cannot be told is kept without one', async () => {
    const audioFiles = createMemoryAudioFileStore()

    const kept = await keepAudioFile(new File(['rain'], 'rain.mp3', { type: 'audio/mpeg' }), audioFiles, async () => undefined)

    expect(kept).toEqual({ id: expect.any(String), name: 'rain.mp3' })
  })

  test('a file that is not audio is not kept', async () => {
    const audioFiles = createMemoryAudioFileStore()

    expect(await keepAudioFile(new File(['notes'], 'notes.txt', { type: 'text/plain' }), audioFiles, async () => null)).toBeNull()

    expect(await audioFiles.list()).toEqual([])
  })
})
