import { ringSoundOf } from './sound'

describe('a ring sound', () => {
  test('is the one chosen', () => {
    expect(ringSoundOf({ ringSound: { kind: 'audio file', fileId: 'gong' } })).toEqual({ kind: 'audio file', fileId: 'gong' })
  })

  test('is the bell for a timer or an alarm that has none chosen, such as one saved before ring sounds could be chosen', () => {
    expect(ringSoundOf({})).toEqual({ kind: 'built-in', name: 'bell' })
  })
})
