import { createMemorySoundPlayer } from './sound-player'

const SECOND = 1_000

describe('the memory player playing audio files', () => {
  test('pausing a file gives how far into it it got: the place it started from and how long it played', async () => {
    const player = createMemorySoundPlayer()
    await player.playFile('rain', 40 * SECOND, 0.6)

    player.playFor(5 * SECOND)

    expect(await player.pauseFile()).toBe(45 * SECOND)
  })

  test('a file played to its end is reported to every listener with its id, and stays cued until it is paused or stopped', async () => {
    const player = createMemorySoundPlayer()
    const ended: string[] = []
    player.onFileEnded((fileId) => ended.push(fileId))
    await player.playFile('rain', 0, 0.6)

    player.endFile()

    expect(ended).toEqual(['rain'])
    expect(await player.fileCued()).toBe('rain')
    await player.stopFile()
    expect(await player.fileCued()).toBeNull()
  })

  test('reports how far into the file playing it got to every listener when a test asks, as a player does every 15 seconds', async () => {
    const player = createMemorySoundPlayer()
    const places: { fileId: string, at: number }[] = []
    player.onFilePlace((fileId, at) => places.push({ fileId, at }))
    player.reportPlace()
    await player.playFile('rain', 40 * SECOND, 0.6)
    player.playFor(15 * SECOND)

    player.reportPlace()

    expect(places).toEqual([{ fileId: 'rain', at: 55 * SECOND }])
  })

  test('a file plays on at a volume changed while it plays', async () => {
    const player = createMemorySoundPlayer()
    await player.playFile('rain', 0, 0.6)

    await player.setFileVolume(0.2)

    expect(player.filePlaying()).toEqual({ fileId: 'rain', at: 0, volume: 0.2 })
  })
})
