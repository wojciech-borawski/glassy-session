import { render } from '@testing-library/vue'
import { defineComponent, h, nextTick, type ComputedRef } from 'vue'
import { createMemoryBackground } from '@/infrastructure/memory/background'
import { createManualClock } from '@/infrastructure/memory/display-clock'
import { provideDisplayClock } from '../display-clock'
import { provideStoredSessions } from '../session/stored-sessions'
import { createTimer } from '../timer/model/timer'
import { provideStoredTimers } from '../timer/stored-timers'
import { provideStoredTrackedTime } from '../tracking/stored-tracked-time'
import { useStoredAsOfNow } from './stored-as-of-now'

const NINE = new Date(2026, 10, 18, 9).getTime()

const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'task', plannedTime: 180_000, appearance: { colour: 'teal' } })

describe('the stored timers and focus sessions as of now', () => {
  test('views reading them at the same tick of the display clock share one settlement, and the next tick settles again', async () => {
    const clock = createManualClock(NINE)
    const background = createMemoryBackground({ now: () => clock.now.value, timers: [tea] })
    const views: ComputedRef<{ timers: unknown }>[] = []
    const view = defineComponent({
      setup() {
        const stored = useStoredAsOfNow()
        views.push(stored)
        return () => h('div', String(stored.value.timers))
      }
    })
    render(defineComponent({
      setup() {
        provideStoredTimers(background.storedTimers)
        provideStoredSessions(background.storedSessions)
        provideStoredTrackedTime(background.storedTrackedTime)
        provideDisplayClock(clock.now)
        return () => [h(view), h(view)]
      }
    }))
    const [one, other] = views
    const atNine = one?.value.timers

    expect(other?.value.timers).toBe(atNine)
    clock.advanceBy(250)
    await nextTick()

    expect(one?.value.timers).not.toBe(atNine)
    expect(other?.value.timers).toBe(one?.value.timers)
  })
})
