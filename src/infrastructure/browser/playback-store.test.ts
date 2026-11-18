import { fakeBrowser } from 'wxt/testing/fake-browser'
import type { Cue, Playback } from '@/domain/music/model/playback'
import { createBrowserPlaybackStore } from './playback-store'

const SECOND = 1_000

const rain: Cue = { owner: { of: 'timer', id: 'pasta' }, playlistId: 'focus-mix', fileId: 'rain', from: 0, volume: 0.6 }

const playingRain: Playback = {
  owners: [{ owner: { of: 'timer', id: 'pasta' }, running: true, place: { playlistId: 'focus-mix', fileId: 'rain', at: 0 } }],
  soundPaused: false,
  playing: rain
}

beforeEach(() => {
  fakeBrowser.reset()
})

describe('the stored playback', () => {
  test('reads back with the place reported since it was saved, as where the sound playing and its owner are', async () => {
    const store = createBrowserPlaybackStore()
    await store.save(playingRain)

    await store.savePlace({ cue: rain, at: 30 * SECOND })

    expect(await store.load()).toEqual({
      ...playingRain,
      owners: [{ owner: { of: 'timer', id: 'pasta' }, running: true, place: { playlistId: 'focus-mix', fileId: 'rain', at: 30 * SECOND } }],
      playing: { ...rain, from: 30 * SECOND }
    })
  })

  test('a playback saved after a place was reported replaces that place, so a sound played again from elsewhere in the file starts there', async () => {
    const store = createBrowserPlaybackStore()
    await store.save(playingRain)
    await store.savePlace({ cue: rain, at: 30 * SECOND })
    const resumedFurtherOn: Playback = { ...playingRain, playing: { ...rain, from: 80 * SECOND } }

    await store.save(resumedFurtherOn)

    expect(await store.load()).toEqual(resumedFurtherOn)
  })

  test('saving a playback writes it and clears the reported place in one storage write, so a background that stops in between cannot apply an old place', async () => {
    const store = createBrowserPlaybackStore()
    await store.savePlace({ cue: rain, at: 30 * SECOND })
    const set = vi.spyOn(fakeBrowser.storage.local, 'set')
    const remove = vi.spyOn(fakeBrowser.storage.local, 'remove')

    await store.save(playingRain)

    expect(set.mock.calls).toEqual([[{ playback: playingRain, playbackPlace: null }]])
    expect(remove).not.toHaveBeenCalled()
  })
})
