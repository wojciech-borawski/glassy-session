import { fakeBrowser } from 'wxt/testing/fake-browser'
import type { SavedMusic } from '@/domain/music/ports'
import { createBrowserMusicStore, readStoredMusic, watchStoredMusic } from './music-store'

beforeEach(() => {
  fakeBrowser.reset()
})

const music: SavedMusic = {
  playlists: [{ id: 'focus-mix', name: 'Focus mix', files: [{ id: 'rain', name: 'rain.mp3', length: 180_000 }] }],
  backgroundSounds: [{ owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'focus-mix', volume: 0.3 } }]
}

describe('the browser music store', () => {
  test('an empty storage loads as no playlists and no background sounds', async () => {
    expect(await createBrowserMusicStore().load()).toEqual({ playlists: [], backgroundSounds: [] })
  })

  test('saved playlists and background sounds load back, also in a store created later', async () => {
    await createBrowserMusicStore().save(music)

    expect(await createBrowserMusicStore().load()).toEqual(music)
  })

  test('other contexts read what the background saved', async () => {
    await createBrowserMusicStore().save(music)

    expect(await readStoredMusic()).toEqual(music)
  })

  test('a watcher hears each save with what was saved, until it stops watching', async () => {
    const heard: SavedMusic[] = []
    const stopWatching = watchStoredMusic((saved) => heard.push(saved))

    await createBrowserMusicStore().save(music)
    stopWatching()
    await createBrowserMusicStore().save({ playlists: [], backgroundSounds: [] })

    expect(heard).toEqual([music])
  })
})
