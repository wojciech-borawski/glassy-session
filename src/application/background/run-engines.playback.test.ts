import { IDBFactory } from 'fake-indexeddb'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { fakeOffscreen } from '@/infrastructure/browser/fake-offscreen'
import { sendMusicCommand, sendSoundCommand } from '@/infrastructure/browser/music-commands'
import { createBrowserPlaybackStore, readStoredPlayback, watchStoredPlayback } from '@/infrastructure/browser/playback-store'
import { sendSessionCommand } from '@/infrastructure/browser/session-commands'
import { sendTimerCommand } from '@/infrastructure/browser/timer-commands'

const SECOND = 1_000
const MINUTE = 60 * SECOND
const NINE = new Date(2026, 10, 17, 9).getTime()

const pasta = { id: 'pasta', name: 'Pasta', kind: 'timer', plannedTime: 10 * MINUTE, appearance: { colour: 'gold' } } as const

/** Starts the background as the browser does: its module is loaded anew, so it keeps nothing from a background that ran before. */
async function startBackground() {
  vi.resetModules()
  const { runEngines } = await import('./run-engines')
  await runEngines()
}

/**
 * Stops the background and closes the offscreen document, as Chromium does after 30 seconds of silence, keeping only what was stored.
 * Gives the offscreen document that opens next.
 */
async function restartBackground() {
  const stored = await fakeBrowser.storage.local.get()
  fakeBrowser.reset()
  await fakeBrowser.storage.local.set(stored)
  const offscreen = fakeOffscreen()
  await startBackground()
  return offscreen
}

async function givePastaAPlaylist() {
  await sendTimerCommand({ type: 'add', timer: pasta })
  await sendMusicCommand({ type: 'addPlaylist', playlist: { id: 'focus-mix', name: 'Focus mix' } })
  await sendMusicCommand({ type: 'addFiles', playlistId: 'focus-mix', files: [{ id: 'rain', name: 'rain.mp3' }, { id: 'waves', name: 'waves.ogg' }] })
  await sendMusicCommand({ type: 'chooseBackgroundSound', owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'focus-mix', volume: 0.6 } })
}

beforeEach(async () => {
  fakeBrowser.reset()
  globalThis.indexedDB = new IDBFactory()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NINE)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the background playing a background sound', () => {
  test('a timer that starts plays its playlist in the offscreen document', async () => {
    const offscreen = fakeOffscreen()
    await startBackground()
    await givePastaAPlaylist()

    await sendTimerCommand({ type: 'start', timerId: 'pasta' })

    await vi.waitFor(() => expect(offscreen.playerInDocument().filePlaying()).toEqual({ fileId: 'rain', at: 0, volume: 0.6 }))
  })

  test('a file that ends in the offscreen document moves the playlist on to the next file', async () => {
    const offscreen = fakeOffscreen()
    await startBackground()
    await givePastaAPlaylist()
    await sendTimerCommand({ type: 'start', timerId: 'pasta' })
    await vi.waitFor(() => expect(offscreen.playerInDocument().filePlaying()).not.toBeNull())

    offscreen.playerInDocument().endFile()

    await vi.waitFor(() => expect(offscreen.playerInDocument().filePlaying()).toEqual({ fileId: 'waves', at: 0, volume: 0.6 }))
  })

  test('a playlist none of whose files can play in the offscreen document is stored as stopped, and the document plays nothing', async () => {
    const offscreen = fakeOffscreen()
    await startBackground()
    await givePastaAPlaylist()
    await sendTimerCommand({ type: 'start', timerId: 'pasta' })
    await vi.waitFor(() => expect(offscreen.playerInDocument().filePlaying()).toEqual({ fileId: 'rain', at: 0, volume: 0.6 }))

    offscreen.playerInDocument().cannotPlayFile()
    await vi.waitFor(() => expect(offscreen.playerInDocument().filePlaying()).toEqual({ fileId: 'waves', at: 0, volume: 0.6 }))
    offscreen.playerInDocument().cannotPlayFile()

    await vi.waitFor(async () => expect(await readStoredPlayback()).toMatchObject({ soundPaused: true, playing: null, unplayable: ['rain', 'waves'] }))
    expect(offscreen.playerInDocument().filePlaying()).toBeNull()
  })

  test('a sound command sent from another context pauses the sound while the timer runs on', async () => {
    const offscreen = fakeOffscreen()
    await startBackground()
    await givePastaAPlaylist()
    await sendTimerCommand({ type: 'start', timerId: 'pasta' })
    await vi.waitFor(() => expect(offscreen.playerInDocument().filePlaying()).not.toBeNull())

    expect(await sendSoundCommand({ type: 'pauseSound' })).toBeNull()

    expect(offscreen.playerInDocument().filePlaying()).toBeNull()
  })

  test('a volume of 0 has the offscreen document pause the file, and a volume above 0 plays it on from that place', async () => {
    const offscreen = fakeOffscreen()
    await startBackground()
    await givePastaAPlaylist()
    await sendTimerCommand({ type: 'start', timerId: 'pasta' })
    await vi.waitFor(() => expect(offscreen.playerInDocument().filePlaying()).not.toBeNull())
    offscreen.playerInDocument().playFor(25 * SECOND)

    await sendMusicCommand({ type: 'chooseBackgroundSound', owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'focus-mix', volume: 0 } })
    expect(offscreen.playerInDocument().filePlaying()).toBeNull()
    expect(await offscreen.playerInDocument().fileCued()).toBeNull()
    await sendMusicCommand({ type: 'chooseBackgroundSound', owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'focus-mix', volume: 0.5 } })

    expect(offscreen.playerInDocument().filePlaying()).toEqual({ fileId: 'rain', at: 25 * SECOND, volume: 0.5 })
  })
})

describe('a background that stops and starts again', () => {
  test('keeps the place the sound of a paused timer got to, and resumes it there in a newly opened offscreen document', async () => {
    const offscreen = fakeOffscreen()
    await startBackground()
    await givePastaAPlaylist()
    await sendTimerCommand({ type: 'start', timerId: 'pasta' })
    await vi.waitFor(() => expect(offscreen.playerInDocument().filePlaying()).not.toBeNull())
    offscreen.playerInDocument().playFor(40 * SECOND)
    await sendTimerCommand({ type: 'pause', timerId: 'pasta' })
    await vi.waitFor(() => expect(offscreen.playerInDocument().filePlaying()).toBeNull())

    const reopened = await restartBackground()
    await sendTimerCommand({ type: 'start', timerId: 'pasta' })

    await vi.waitFor(() => expect(reopened.playerInDocument().filePlaying()).toEqual({ fileId: 'rain', at: 40 * SECOND, volume: 0.6 }))
    expect(reopened.created).toHaveLength(1)
  })

  test('plays the sound of a timer that still runs again in a newly opened offscreen document, from the place it last started from', async () => {
    const offscreen = fakeOffscreen()
    await startBackground()
    await givePastaAPlaylist()
    await sendTimerCommand({ type: 'start', timerId: 'pasta' })
    await vi.waitFor(() => expect(offscreen.playerInDocument().filePlaying()).not.toBeNull())
    offscreen.playerInDocument().playFor(40 * SECOND)
    await sendTimerCommand({ type: 'pause', timerId: 'pasta' })
    await sendTimerCommand({ type: 'start', timerId: 'pasta' })
    await vi.waitFor(() => expect(offscreen.playerInDocument().filePlaying()).not.toBeNull())

    const reopened = await restartBackground()

    await vi.waitFor(() => expect(reopened.playerInDocument().filePlaying()).toEqual({ fileId: 'rain', at: 40 * SECOND, volume: 0.6 }))
  })

  test('a timer that finished while the browser was closed never plays its sound again when the browser starts', async () => {
    const offscreen = fakeOffscreen()
    await startBackground()
    await givePastaAPlaylist()
    await sendTimerCommand({ type: 'start', timerId: 'pasta' })
    await vi.waitFor(() => expect(offscreen.playerInDocument().filePlaying()).not.toBeNull())
    vi.setSystemTime(NINE + 3 * 60 * MINUTE)

    const reopened = await restartBackground()
    await fakeBrowser.runtime.onStartup.trigger()

    await vi.waitFor(async () => expect((await readStoredPlayback()).owners).toEqual([]))
    expect(reopened.filesPlayed).toEqual([])
    expect(reopened.playerInDocument().filePlaying()).toBeNull()
  })

  test('plays the sound of a timer that still runs on in a newly opened offscreen document from the last place the document reported', async () => {
    const offscreen = fakeOffscreen()
    await startBackground()
    await givePastaAPlaylist()
    await sendTimerCommand({ type: 'start', timerId: 'pasta' })
    await vi.waitFor(() => expect(offscreen.playerInDocument().filePlaying()).not.toBeNull())
    offscreen.playerInDocument().playFor(75 * SECOND)
    offscreen.playerInDocument().reportPlace()
    await vi.waitFor(async () => expect((await createBrowserPlaybackStore().load()).playing?.from).toBe(75 * SECOND))
    offscreen.playerInDocument().playFor(10 * SECOND)

    const reopened = await restartBackground()

    await vi.waitFor(() => expect(reopened.playerInDocument().filePlaying()).toEqual({ fileId: 'rain', at: 75 * SECOND, volume: 0.6 }))
  })

  test('stores the place the offscreen document reports apart from the playback the popup and overlay follow, so an open view is not told of it', async () => {
    const offscreen = fakeOffscreen()
    await startBackground()
    await givePastaAPlaylist()
    await sendTimerCommand({ type: 'start', timerId: 'pasta' })
    await vi.waitFor(() => expect(offscreen.playerInDocument().filePlaying()).not.toBeNull())
    const followed = await readStoredPlayback()
    const toldViews: unknown[] = []
    const stopWatching = watchStoredPlayback((playback) => toldViews.push(playback))

    offscreen.playerInDocument().playFor(30 * SECOND)
    offscreen.playerInDocument().reportPlace()

    await vi.waitFor(async () => expect((await createBrowserPlaybackStore().load()).playing?.from).toBe(30 * SECOND))
    stopWatching()
    expect(toldViews).toEqual([])
    expect(await readStoredPlayback()).toEqual(followed)
  })
})

describe('a whole round of background sounds with the real background', () => {
  const soup = { id: 'soup', name: 'Soup', kind: 'timer', plannedTime: 60 * MINUTE, appearance: { colour: 'green' } } as const
  const writeReport = { id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'blue' } } as const
  const morning = { id: 'morning', name: 'Morning', taskIds: ['write-report'], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' } as const

  async function giveSoupAndPastaPlaylists() {
    await sendTimerCommand({ type: 'add', timer: { ...pasta, plannedTime: 60 * MINUTE } })
    await sendTimerCommand({ type: 'add', timer: soup })
    await sendMusicCommand({ type: 'addPlaylist', playlist: { id: 'focus-mix', name: 'Focus mix' } })
    await sendMusicCommand({ type: 'addFiles', playlistId: 'focus-mix', files: [{ id: 'rain', name: 'rain.mp3' }, { id: 'waves', name: 'waves.ogg' }] })
    await sendMusicCommand({ type: 'addPlaylist', playlist: { id: 'calm', name: 'Calm' } })
    await sendMusicCommand({ type: 'addFiles', playlistId: 'calm', files: [{ id: 'birds', name: 'birds.mp3' }] })
    await sendMusicCommand({ type: 'chooseBackgroundSound', owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'focus-mix', volume: 0.6 } })
    await sendMusicCommand({ type: 'chooseBackgroundSound', owner: { of: 'timer', id: 'soup' }, sound: { playlistId: 'calm', volume: 0.3 } })
  }

  async function fireAllWakes() {
    for (const alarm of await browser.alarms.getAll()) {
      await fakeBrowser.alarms.onAlarm.trigger(alarm)
    }
  }

  test('the sound switches between two timers, keeps each place, stays paused by the person until a break, and moves along its playlist', async () => {
    const offscreen = fakeOffscreen()
    await startBackground()
    await giveSoupAndPastaPlaylists()
    await sendTimerCommand({ type: 'add', timer: writeReport })
    await sendSessionCommand({ type: 'add', session: morning })
    await sendSessionCommand({ type: 'start', sessionId: 'morning' })
    const playing = () => offscreen.playerInDocument().filePlaying()

    await sendTimerCommand({ type: 'start', timerId: 'pasta' })
    await vi.waitFor(() => expect(playing()).toEqual({ fileId: 'rain', at: 0, volume: 0.6 }))
    offscreen.playerInDocument().playFor(30 * SECOND)

    await sendTimerCommand({ type: 'start', timerId: 'soup' })
    await vi.waitFor(() => expect(playing()).toEqual({ fileId: 'birds', at: 0, volume: 0.3 }))
    offscreen.playerInDocument().playFor(10 * SECOND)

    await sendTimerCommand({ type: 'pause', timerId: 'soup' })
    await vi.waitFor(() => expect(playing()).toEqual({ fileId: 'rain', at: 30 * SECOND, volume: 0.6 }))
    offscreen.playerInDocument().playFor(20 * SECOND)

    expect(await sendSoundCommand({ type: 'pauseSound' })).toBeNull()
    expect(playing()).toBeNull()

    vi.setSystemTime(NINE + 25 * MINUTE + SECOND)
    await fireAllWakes()
    await vi.waitFor(() => expect(playing()).toEqual({ fileId: 'rain', at: 50 * SECOND, volume: 0.6 }))

    expect(await sendSoundCommand({ type: 'nextFile' })).toBeNull()
    await vi.waitFor(() => expect(playing()).toEqual({ fileId: 'waves', at: 0, volume: 0.6 }))

    offscreen.playerInDocument().endFile()
    await vi.waitFor(() => expect(playing()).toEqual({ fileId: 'rain', at: 0, volume: 0.6 }))
  })
})

