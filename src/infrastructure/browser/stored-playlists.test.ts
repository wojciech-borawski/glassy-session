import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createBrowserMusicStore } from './music-store'
import { createBrowserPlaybackStore } from './playback-store'
import { createBrowserStoredPlaylists } from './stored-playlists'

const focusMix = { id: 'focus-mix', name: 'Focus mix', files: [{ id: 'rain', name: 'rain.mp3', length: 180_000 }] }
const pastaSound = { owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'focus-mix', volume: 0.3 } } as const

beforeEach(() => {
  fakeBrowser.reset()
})

describe('the stored playlists as the browser keeps them', () => {
  test('the playlists and background sounds are those in storage, first as read and then after each save', async () => {
    await createBrowserMusicStore().save({ playlists: [focusMix], backgroundSounds: [] })
    const stored = createBrowserStoredPlaylists()

    await vi.waitFor(() => expect(stored.playlists.value).toEqual([focusMix]))
    await createBrowserMusicStore().save({ playlists: [focusMix], backgroundSounds: [pastaSound] })

    await vi.waitFor(() => expect(stored.backgroundSounds.value).toEqual([pastaSound]))
  })

  test('a command goes to the background as a message and resolves with the answer of the background', async () => {
    const received: unknown[] = []
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      received.push(message)
      sendResponse({ refusal: null })
      return true
    })

    const refusal = await createBrowserStoredPlaylists().send({ type: 'removePlaylist', playlistId: 'focus-mix' })

    expect(refusal).toBeNull()
    expect(received).toEqual([{ type: 'removePlaylist', playlistId: 'focus-mix' }])
  })

  test('the playback is the one in storage, first as read and then after each save', async () => {
    const heard = { owners: [{ owner: { of: 'timer', id: 'pasta' }, running: true, place: { playlistId: 'focus-mix', fileId: 'rain', at: 0 } }], soundPaused: false, playing: null } as const
    await createBrowserPlaybackStore().save(heard)
    const stored = createBrowserStoredPlaylists()

    await vi.waitFor(() => expect(stored.playback.value).toEqual(heard))
    await createBrowserPlaybackStore().save({ ...heard, soundPaused: true })

    await vi.waitFor(() => expect(stored.playback.value.soundPaused).toBe(true))
  })

  test('a sound command goes to the background as a message and resolves with the answer of the background', async () => {
    const received: unknown[] = []
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      received.push(message)
      sendResponse({ refusal: null })
      return true
    })

    expect(await createBrowserStoredPlaylists().sendSound({ type: 'nextFile' })).toBeNull()

    expect(received).toEqual([{ type: 'nextFile' }])
  })
})
