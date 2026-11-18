import { createTickingClock } from './display-clock'

const NINE = Date.UTC(2026, 10, 17, 9)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NINE)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the ticking display clock', () => {
  test('starts at the current moment and follows the system clock as it ticks', () => {
    const now = createTickingClock()
    const startedAt = now.value

    vi.advanceTimersByTime(1_000)

    expect(startedAt).toBe(NINE)
    expect(now.value).toBe(NINE + 1_000)
  })

  test('stops ticking when the scope it was created in ends', () => {
    const scope = effectScope()
    const now = scope.run(() => createTickingClock())

    scope.stop()
    vi.advanceTimersByTime(1_000)

    expect(now?.value).toBe(NINE)
  })
})
