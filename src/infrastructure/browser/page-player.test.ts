import { createMemoryAudioFileStore } from '../memory/audio-file-store'
import { createFakeAudioContext } from './fake-audio-context'
import { createFakeAudioElements } from './fake-audio-element'
import { createPagePlayer } from './page-player'

describe('the page player', () => {
  test('the bell starts each of its tones at its pitch, at once and at the volume asked', async () => {
    const audio = createFakeAudioContext()

    await createPagePlayer({ createContext: audio.factory, audioFiles: createMemoryAudioFileStore() }).playOnce({ kind: 'built-in', name: 'bell' }, 0.4)

    expect(audio.sounded.waves).toEqual([
      { frequency: 880, wave: 'sine', from: 10 },
      { frequency: 1_760, wave: 'sine', from: 10 },
      { frequency: 2_428, wave: 'sine', from: 10 }
    ])
    expect(audio.sounded.volumes).toEqual([0.4])
  })

  test('a tone that comes later in its sound starts that much after the sound starts', async () => {
    const audio = createFakeAudioContext()

    await createPagePlayer({ createContext: audio.factory, audioFiles: createMemoryAudioFileStore() }).playOnce({ kind: 'built-in', name: 'soft chime' }, 1)

    expect(audio.sounded.waves.map(({ from }) => from)).toEqual([10, 10.18])
  })

  test('every sound the player plays goes through the one audio context it made first', async () => {
    const audio = createFakeAudioContext()
    const player = createPagePlayer({ createContext: audio.factory, audioFiles: createMemoryAudioFileStore() })

    await player.playOnce({ kind: 'built-in', name: 'digital' }, 1)
    await player.playOnce({ kind: 'built-in', name: 'marimba' }, 0.5)

    expect(audio.created()).toBe(1)
    expect(audio.sounded.volumes).toEqual([1, 0.5])
  })

  test('one of the person\'s own audio files plays its kept content at once, at the volume asked', async () => {
    const audio = createFakeAudioContext()
    const audioFiles = createMemoryAudioFileStore()
    const fileId = await audioFiles.save({ name: 'gong.mp3', type: 'audio/mpeg', bytes: new Uint8Array([7, 8, 9]).buffer })

    await createPagePlayer({ createContext: audio.factory, audioFiles }).playOnce({ kind: 'audio file', fileId }, 0.6)

    expect(audio.sounded.files).toEqual([{ bytes: [7, 8, 9], from: 10 }])
    expect(audio.sounded.volumes).toEqual([0.6])
  })

  test.each([
    ['is no longer kept', null],
    ['is no audio', new ArrayBuffer(0)]
  ])('an own audio file that %s plays the bell instead, so a ring is never silent', async (_why, bytes) => {
    const audio = createFakeAudioContext()
    const audioFiles = createMemoryAudioFileStore()
    const fileId = bytes === null ? 'removed' : await audioFiles.save({ name: 'notes.txt', type: 'text/plain', bytes })

    await createPagePlayer({ createContext: audio.factory, audioFiles }).playOnce({ kind: 'audio file', fileId }, 0.6)

    expect(audio.sounded.waves.map(({ frequency }) => frequency)).toEqual([880, 1_760, 2_428])
  })
})

describe('the page player playing audio files on their own', () => {
  function deferred() {
    let resolve = () => {}
    const promise = new Promise<void>((done) => {
      resolve = done
    })
    return { promise, resolve }
  }

  async function playerWithFile(bytes: readonly number[] = [7, 8, 9]) {
    const audioFiles = createMemoryAudioFileStore()
    const fileId = await audioFiles.save({ name: 'rain.mp3', type: 'audio/mpeg', bytes: new Uint8Array(bytes).buffer })
    const elements = createFakeAudioElements()
    const player = createPagePlayer({ createContext: createFakeAudioContext().factory, createAudio: elements.factory, audioFiles })
    return { player, fileId, elements, audioFiles }
  }

  test('a file plays its kept content from the place asked, at the volume asked', async () => {
    const urls = vi.spyOn(URL, 'createObjectURL')
    const { player, fileId, elements } = await playerWithFile([7, 8, 9])

    await player.playFile(fileId, 40_000, 0.6)

    const [audio] = elements.made
    expect(audio).toMatchObject({ currentTime: 40, volume: 0.6, paused: false })
    const blob = urls.mock.calls[0]?.[0] as Blob
    expect(audio?.src).toBe(urls.mock.results[0]?.value)
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([7, 8, 9])
  })

  test('pausing a file gives how far into it it got, and lets go of its content', async () => {
    const revoked = vi.spyOn(URL, 'revokeObjectURL')
    const { player, fileId, elements } = await playerWithFile()
    await player.playFile(fileId, 40_000, 0.6)
    const [audio] = elements.made
    const url = audio?.src
    audio!.currentTime = 52.25

    expect(await player.pauseFile()).toBe(52_250)

    expect(audio).toMatchObject({ paused: true, src: '' })
    expect(revoked).toHaveBeenCalledWith(url)
    expect(await player.pauseFile()).toBeNull()
  })

  test('playing another file stops the one before and lets go of its content', async () => {
    const { player, fileId, elements, audioFiles } = await playerWithFile()
    const waves = await audioFiles.save({ name: 'waves.mp3', type: 'audio/mpeg', bytes: new Uint8Array([1]).buffer })
    await player.playFile(fileId, 0, 0.6)

    await player.playFile(waves, 0, 0.6)

    expect(elements.made.map(({ paused, src }) => ({ paused, released: src === '' }))).toEqual([{ paused: true, released: true }, { paused: false, released: false }])
    expect(await player.fileCued()).toBe(waves)
  })

  test('stopping a file lets go of it, so nothing is cued any more', async () => {
    const { player, fileId, elements } = await playerWithFile()
    await player.playFile(fileId, 0, 0.6)

    await player.stopFile()

    expect(elements.made[0]).toMatchObject({ paused: true, src: '' })
    expect(await player.fileCued()).toBeNull()
  })

  test('a file plays on at a volume changed while it plays', async () => {
    const { player, fileId, elements } = await playerWithFile()
    await player.playFile(fileId, 0, 0.6)

    await player.setFileVolume(0.25)

    expect(elements.made[0]).toMatchObject({ paused: false, volume: 0.25 })
  })

  test('a file that plays to its end is reported with its id, and stays cued until the player is told what comes next', async () => {
    const { player, fileId, elements } = await playerWithFile()
    const ended: string[] = []
    player.onFileEnded((id) => ended.push(id))
    await player.playFile(fileId, 0, 0.6)

    elements.made[0]?.end()

    expect(ended).toEqual([fileId])
    expect(await player.fileCued()).toBe(fileId)
  })

  test('a file playing reports how far into it it got every 15 seconds, until it is paused', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const { player, fileId, elements } = await playerWithFile()
    const places: { fileId: string, at: number }[] = []
    player.onFilePlace((id, at) => places.push({ fileId: id, at }))
    await player.playFile(fileId, 40_000, 0.6)
    const [audio] = elements.made

    audio!.currentTime = 54.5
    vi.advanceTimersByTime(14_999)
    expect(places).toEqual([])
    vi.advanceTimersByTime(1)
    expect(places).toEqual([{ fileId, at: 54_500 }])
    audio!.currentTime = 69.75
    vi.advanceTimersByTime(15_000)
    expect(places).toEqual([{ fileId, at: 54_500 }, { fileId, at: 69_750 }])
    await player.pauseFile()
    vi.advanceTimersByTime(60_000)

    expect(places).toHaveLength(2)
    vi.useRealTimers()
  })

  test('a file that plays to its end reports no place after it ended, and another file played reports only its own', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const { player, fileId, elements, audioFiles } = await playerWithFile()
    const waves = await audioFiles.save({ name: 'waves.mp3', type: 'audio/mpeg', bytes: new Uint8Array([1]).buffer })
    const places: string[] = []
    player.onFilePlace((id) => places.push(id))
    await player.playFile(fileId, 0, 0.6)
    elements.made[0]?.end()
    vi.advanceTimersByTime(30_000)
    expect(places).toEqual([])

    await player.playFile(waves, 0, 0.6)
    vi.advanceTimersByTime(15_000)

    expect(places).toEqual([waves])
    vi.useRealTimers()
  })

  test('a ring plays over the file playing, which plays on', async () => {
    const audio = createFakeAudioContext()
    const audioFiles = createMemoryAudioFileStore()
    const fileId = await audioFiles.save({ name: 'rain.mp3', type: 'audio/mpeg', bytes: new Uint8Array([1]).buffer })
    const elements = createFakeAudioElements()
    const player = createPagePlayer({ createContext: audio.factory, createAudio: elements.factory, audioFiles })
    await player.playFile(fileId, 0, 0.6)

    await player.playOnce({ kind: 'built-in', name: 'bell' }, 1)

    expect(audio.sounded.waves).toHaveLength(3)
    expect(elements.made[0]).toMatchObject({ paused: false })
    expect(await player.fileCued()).toBe(fileId)
  })

  test('a file asked to play while the one asked before is still being read plays alone, and the one before never starts', async () => {
    const { player, fileId, elements, audioFiles } = await playerWithFile()
    const waves = await audioFiles.save({ name: 'waves.mp3', type: 'audio/mpeg', bytes: new Uint8Array([1]).buffer })
    const slowRead = deferred()
    const read = audioFiles.read.bind(audioFiles)
    vi.spyOn(audioFiles, 'read').mockImplementation(async (id) => id === fileId ? slowRead.promise.then(() => read(id)) : read(id))

    const first = player.playFile(fileId, 0, 0.6)
    await player.playFile(waves, 0, 0.6)
    slowRead.resolve()
    await first

    expect(elements.made.filter(({ paused }) => !paused)).toHaveLength(1)
    expect(await player.fileCued()).toBe(waves)
  })

  test('a file stopped while it is still being read never starts', async () => {
    const { player, fileId, elements, audioFiles } = await playerWithFile()
    const slowRead = deferred()
    const read = audioFiles.read.bind(audioFiles)
    vi.spyOn(audioFiles, 'read').mockImplementation(async (id) => slowRead.promise.then(() => read(id)))

    const playing = player.playFile(fileId, 0, 0.6)
    await player.stopFile()
    slowRead.resolve()
    await playing

    expect(elements.made).toEqual([])
    expect(await player.fileCued()).toBeNull()
  })

  test('a kept file the page cannot play is reported as one that cannot play, not as ended, so the playlist moves on', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { player, fileId, elements } = await playerWithFile()
    const ended: string[] = []
    const cannotPlay: string[] = []
    player.onFileEnded((id) => ended.push(id))
    player.onFileCannotPlay((id) => cannotPlay.push(id))
    await player.playFile(fileId, 0, 0.6)

    elements.made[0]?.fail()

    expect(cannotPlay).toEqual([fileId])
    expect(ended).toEqual([])
  })

  test('a file that cannot play again is reported each time, since the playback counts the files that cannot play one after the other', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { player, fileId, elements } = await playerWithFile()
    const cannotPlay: string[] = []
    player.onFileCannotPlay((id) => cannotPlay.push(id))
    await player.playFile(fileId, 0, 0.6)
    elements.made[0]?.fail()

    await player.playFile(fileId, 0, 0.6)
    elements.made[1]?.fail()

    expect(cannotPlay).toEqual([fileId, fileId])
  })

  test('a file that is no longer kept plays nothing, says so in the console, is not cued, and is reported as one that cannot play so the playlist moves on', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { player, elements } = await playerWithFile()
    const cannotPlay: string[] = []
    player.onFileCannotPlay((id) => cannotPlay.push(id))

    await player.playFile('removed', 0, 0.6)

    expect(cannotPlay).toEqual(['removed'])
    expect(elements.made).toEqual([])
    expect(errors).toHaveBeenCalledOnce()
    expect(await player.fileCued()).toBeNull()
  })
})
