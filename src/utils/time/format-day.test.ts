import { formatDay, formatDays } from './format-day'

describe('a day as the locale writes it', () => {
  test('writes the parts of the day that are asked for', () => {
    expect(formatDay('2026-11-16', 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })).toBe('Monday 16 November')
  })

  test('refuses text that is not a day rather than writing some other day', () => {
    expect(() => formatDay('2026-02-30', 'en-GB', { day: 'numeric' })).toThrow('2026-02-30 is not a day')
  })

  test('writes the first and the last day of a range together, without repeating what they share', () => {
    expect(formatDays('2026-11-16', '2026-11-22', 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })).toBe('16\u2009–\u200922 Nov 2026')
  })
})
