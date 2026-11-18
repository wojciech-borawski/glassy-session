import { audioFileIdsLetGo, usersOfAudioFile, type SoundUse } from './sound-use'

const rain = { kind: 'audio file', fileId: 'rain' } as const
const waves = { kind: 'audio file', fileId: 'waves' } as const
const bell = { kind: 'built-in', name: 'bell' } as const

describe('the uses of the person\'s own audio files', () => {
  test('the audio files a change let go of are those played before it and not after, each once, and no built-in sound', () => {
    expect(audioFileIdsLetGo([rain, waves, rain, bell], [waves, bell])).toEqual(['rain'])
  })

  test('an audio file still played after a change is not let go of, wherever it is played', () => {
    expect(audioFileIdsLetGo([rain], [bell, rain])).toEqual([])
  })

  test('the users of an audio file are every timer, alarm, chime and playlist that plays it, in the order given', () => {
    const uses: SoundUse[] = [
      { sound: rain, by: { kind: 'timer', name: 'Tea' } },
      { sound: waves, by: { kind: 'alarm', name: 'Wake up' } },
      { sound: rain, by: { kind: 'end chime' } },
      { sound: bell, by: { kind: 'start chime' } },
      { sound: rain, by: { kind: 'playlist', name: 'Focus mix' } }
    ]

    expect(usersOfAudioFile(uses, 'rain')).toEqual([{ kind: 'timer', name: 'Tea' }, { kind: 'end chime' }, { kind: 'playlist', name: 'Focus mix' }])
  })
})
