import { createTimer, runStateAt } from '@/domain/timer/model/timer'
import { createMemoryStoredTimers } from './stored-timers'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const tea = { id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 3 * MINUTE, appearance: { colour: 'teal' } } as const

describe('the stored timers kept in memory', () => {
  test('a command runs on the timer engine and the timers follow what it saved', async () => {
    const stored = createMemoryStoredTimers({ now: () => NINE })

    const refusal = await stored.send({ type: 'add', timer: tea })

    expect(refusal).toBeNull()
    expect(stored.timers.value).toEqual([createTimer(tea)])
  })

  test('starts with the timers it is given, and a command that fails resolves as a failure that leaves them as they were', async () => {
    const stored = createMemoryStoredTimers({ now: () => NINE, timers: [createTimer(tea)] })

    const refusal = await stored.send({ type: 'change', timerId: 'tea', details: { name: '', plannedTime: MINUTE, appearance: { colour: 'teal' } } })

    expect(refusal).toEqual({ reason: 'failed', message: 'A timer needs a name' })
    expect(stored.timers.value).toEqual([createTimer(tea)])
  })

  test('the timers are reactive, so a started timer shows as running', async () => {
    const stored = createMemoryStoredTimers({ now: () => NINE, timers: [createTimer(tea)] })
    const states = computed(() => stored.timers.value.map((timer) => runStateAt(timer, NINE + MINUTE)))

    await stored.send({ type: 'start', timerId: 'tea' })

    expect(states.value).toEqual(['running'])
  })
})
