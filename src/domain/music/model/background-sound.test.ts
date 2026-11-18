import { noBackgroundSound, soundOf, withoutRemovedPlaylist, withPlaylist, withVolume } from './background-sound'

describe('choosing a playlist', () => {
  test('a timer or focus session that chooses a playlist gets it at half volume', () => {
    expect(withPlaylist(noBackgroundSound, 'focus')).toEqual({ playlistId: 'focus', volume: 0.5 })
  })
})

describe('changing the volume', () => {
  test('a changed volume keeps the chosen playlist', () => {
    expect(withVolume({ playlistId: 'focus', volume: 0.5 }, 0.8)).toEqual({ playlistId: 'focus', volume: 0.8 })
  })

  test.each([
    ['below silent', -0.1],
    ['above full', 1.1],
    ['that is not a number', NaN]
  ])('a volume %s is rejected', (_, volume) => {
    expect(() => withVolume(noBackgroundSound, volume)).toThrow('volume')
  })
})

describe('removing a playlist', () => {
  test('a background sound whose playlist was removed has no playlist and keeps its volume', () => {
    expect(withoutRemovedPlaylist({ playlistId: 'focus', volume: 0.8 }, 'focus')).toEqual({ playlistId: null, volume: 0.8 })
  })

  test('a background sound with another playlist keeps it when a playlist is removed', () => {
    expect(withoutRemovedPlaylist({ playlistId: 'calm', volume: 0.8 }, 'focus')).toEqual({ playlistId: 'calm', volume: 0.8 })
  })
})

describe('the background sound of one timer or focus session', () => {
  const sounds = [
    { owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'focus', volume: 0.3 } },
    { owner: { of: 'focus session', id: 'pasta' }, sound: { playlistId: 'rain', volume: 0.8 } }
  ] as const

  test('is the one it chose, told apart from an owner of the other kind with the same id', () => {
    expect(soundOf(sounds, { of: 'timer', id: 'pasta' })).toEqual({ playlistId: 'focus', volume: 0.3 })
    expect(soundOf(sounds, { of: 'focus session', id: 'pasta' })).toEqual({ playlistId: 'rain', volume: 0.8 })
  })

  test('is none at half volume when it never chose one', () => {
    expect(soundOf(sounds, { of: 'timer', id: 'tea' })).toEqual(noBackgroundSound)
  })
})
