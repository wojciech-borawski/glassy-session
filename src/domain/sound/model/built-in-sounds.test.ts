import { builtInSoundNames } from './sound'
import { tonesOf } from './built-in-sounds'

describe('the built-in sounds', () => {
  test.each(builtInSoundNames)('%s is short: it has tones and the last one ends within two seconds', (name) => {
    const tones = tonesOf(name)

    expect(tones.length).toBeGreaterThan(0)
    expect(Math.max(...tones.map(({ at, length }) => at + length))).toBeLessThanOrEqual(2_000)
  })

  test.each(builtInSoundNames)('%s does not clip: the tones sounding at the same moment add up to no more than full loudness', (name) => {
    const tones = tonesOf(name)
    const loudnessAt = (moment: number) => tones
      .filter(({ at, length }) => at <= moment && moment < at + length)
      .reduce((sum, { loudness }) => sum + loudness, 0)

    expect(Math.max(...tones.map(({ at }) => loudnessAt(at)))).toBeLessThanOrEqual(1)
  })
})
