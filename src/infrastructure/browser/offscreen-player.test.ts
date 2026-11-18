import { fakeBrowser } from 'wxt/testing/fake-browser'
import { fakeOffscreen } from './fake-offscreen'
import { createOffscreenPlayer } from './offscreen-player'

beforeEach(() => {
  fakeBrowser.reset()
})

describe('the offscreen player of Chromium', () => {
  test('opens the offscreen document for audio playback and has it play the sound at the volume', async () => {
    const offscreen = fakeOffscreen()

    await createOffscreenPlayer().playOnce({ kind: 'built-in', name: 'marimba' }, 0.7)

    expect(offscreen.created).toEqual([expect.objectContaining({ url: 'chrome-extension://test-extension-id/offscreen.html', reasons: ['AUDIO_PLAYBACK'] })])
    expect(offscreen.playerInDocument().played).toEqual([{ sound: { kind: 'built-in', name: 'marimba' }, volume: 0.7 }])
  })

  test('plays in the offscreen document already open, without opening another', async () => {
    const offscreen = fakeOffscreen({ open: true })

    await createOffscreenPlayer().playOnce({ kind: 'built-in', name: 'bell' }, 1)

    expect(offscreen.created).toEqual([])
    expect(offscreen.playerInDocument().played).toEqual([{ sound: { kind: 'built-in', name: 'bell' }, volume: 1 }])
  })

  test('two sounds played at once, such as a timer and an alarm ringing together, open the offscreen document once and both play', async () => {
    const offscreen = fakeOffscreen()
    const player = createOffscreenPlayer()

    await Promise.all([player.playOnce({ kind: 'built-in', name: 'bell' }, 1), player.playOnce({ kind: 'built-in', name: 'digital' }, 1)])

    expect(offscreen.created).toHaveLength(1)
    expect(offscreen.playerInDocument().played).toEqual([{ sound: { kind: 'built-in', name: 'bell' }, volume: 1 }, { sound: { kind: 'built-in', name: 'digital' }, volume: 1 }])
  })

  test('the offscreen document leaves a message that is not for it, such as a timer command, for the background to answer', async () => {
    const offscreen = fakeOffscreen({ open: true })

    const answer: unknown = await browser.runtime.sendMessage({ type: 'start', timerId: 'tea' })

    expect(answer).toBeUndefined()
    expect(offscreen.playerInDocument().played).toEqual([])
  })
})

describe('the offscreen player of Chromium playing audio files', () => {
  test('opens the offscreen document and has it play the file from the place, at the volume', async () => {
    const offscreen = fakeOffscreen()

    await createOffscreenPlayer().playFile('rain', 40_000, 0.6)

    expect(offscreen.created).toHaveLength(1)
    expect(offscreen.playerInDocument().filePlaying()).toEqual({ fileId: 'rain', at: 40_000, volume: 0.6 })
  })

  test('pausing a file resolves with how far into it the document got', async () => {
    const offscreen = fakeOffscreen()
    const player = createOffscreenPlayer()
    await player.playFile('rain', 40_000, 0.6)
    offscreen.playerInDocument().playFor(12_000)

    expect(await player.pauseFile()).toBe(52_000)
    expect(offscreen.playerInDocument().filePlaying()).toBeNull()
  })

  test('without an open document no file plays, so pausing, stopping, changing the volume and asking what is cued open none', async () => {
    const offscreen = fakeOffscreen()
    const player = createOffscreenPlayer()

    expect(await player.pauseFile()).toBeNull()
    await player.stopFile()
    await player.setFileVolume(0.3)
    expect(await player.fileCued()).toBeNull()

    expect(offscreen.created).toEqual([])
  })

  test('the document changes the volume of the file playing, says which file is cued, and stops it', async () => {
    const offscreen = fakeOffscreen()
    const player = createOffscreenPlayer()
    await player.playFile('rain', 0, 0.6)

    await player.setFileVolume(0.3)
    expect(offscreen.playerInDocument().filePlaying()).toEqual({ fileId: 'rain', at: 0, volume: 0.3 })
    expect(await player.fileCued()).toBe('rain')
    await player.stopFile()

    expect(offscreen.playerInDocument().filePlaying()).toBeNull()
    expect(await player.fileCued()).toBeNull()
  })

  test('a file that plays to its end in the document is reported to the background with its id', async () => {
    const offscreen = fakeOffscreen()
    const player = createOffscreenPlayer()
    const ended: string[] = []
    player.onFileEnded((fileId) => ended.push(fileId))
    await player.playFile('rain', 0, 0.6)

    offscreen.playerInDocument().endFile()

    await vi.waitFor(() => expect(ended).toEqual(['rain']))
  })

  test('how far into the file playing the document got is reported to the background with the file\'s id', async () => {
    const offscreen = fakeOffscreen()
    const player = createOffscreenPlayer()
    const places: { fileId: string, at: number }[] = []
    player.onFilePlace((fileId, at) => places.push({ fileId, at }))
    await player.playFile('rain', 40_000, 0.6)
    offscreen.playerInDocument().playFor(15_000)

    offscreen.playerInDocument().reportPlace()

    await vi.waitFor(() => expect(places).toEqual([{ fileId: 'rain', at: 55_000 }]))
  })
})
