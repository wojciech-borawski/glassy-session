import { createMemoryStoredPlaylists } from './stored-playlists'

describe('the stored playlists kept in memory', () => {
  test('a command runs on the music engine and the playlists and background sounds follow what it saved', async () => {
    const stored = createMemoryStoredPlaylists()

    expect(await stored.send({ type: 'addPlaylist', playlist: { id: 'focus-mix', name: 'Focus mix' } })).toBeNull()
    expect(await stored.send({ type: 'chooseBackgroundSound', owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'focus-mix', volume: 0.3 } })).toBeNull()

    expect(stored.playlists.value).toEqual([{ id: 'focus-mix', name: 'Focus mix', files: [] }])
    expect(stored.backgroundSounds.value).toEqual([{ owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'focus-mix', volume: 0.3 } }])
  })

  test('starts with the music it is given, and a command that fails resolves as a failure that leaves it as it was', async () => {
    const focusMix = { id: 'focus-mix', name: 'Focus mix', files: [] }
    const stored = createMemoryStoredPlaylists({ playlists: [focusMix], backgroundSounds: [] })

    const refusal = await stored.send({ type: 'renamePlaylist', playlistId: 'focus-mix', name: ' ' })

    expect(refusal).toEqual({ reason: 'failed', message: 'A playlist needs a name' })
    expect(stored.playlists.value).toEqual([focusMix])
  })

  test('keeps a picked audio file under a new id with its name and a length of three minutes, and keeps nothing for a file that is not audio', async () => {
    const stored = createMemoryStoredPlaylists()

    const kept = await stored.keepFile(new File(['rain'], 'rain.mp3', { type: 'audio/mpeg' }))
    const notAudio = await stored.keepFile(new File(['notes'], 'notes.txt', { type: 'text/plain' }))

    expect(kept).toEqual({ id: expect.any(String), name: 'rain.mp3', length: 180_000 })
    expect(notAudio).toBeNull()
  })

  test('starts with the playback it is given, and a sound command runs on the playback engine and the playback follows what it saved', async () => {
    const focusMix = { id: 'focus-mix', name: 'Focus mix', files: [{ id: 'rain', name: 'rain.mp3', length: 180_000 }] }
    const pasta = { of: 'timer', id: 'pasta' } as const
    const heard = { owners: [{ owner: pasta, running: true, place: null }], soundPaused: false, playing: null }
    const stored = createMemoryStoredPlaylists({ playlists: [focusMix], backgroundSounds: [{ owner: pasta, sound: { playlistId: 'focus-mix', volume: 0.3 } }] }, heard)

    expect(stored.playback.value).toEqual(heard)
    expect(await stored.sendSound({ type: 'pauseSound' })).toBeNull()

    expect(stored.playback.value.soundPaused).toBe(true)
  })
})

