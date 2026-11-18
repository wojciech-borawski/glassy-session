import { render, screen } from '@testing-library/vue'
import { defineComponent, h } from 'vue'
import { createMemoryStoredTimers } from '@/infrastructure/memory/stored-timers'
import { createTimer } from './model/timer'
import { provideStoredTimers, useStoredTimers } from './stored-timers'

const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 180_000, appearance: { colour: 'teal' } })

const TimerNames = defineComponent({
  setup() {
    const { timers } = useStoredTimers()
    return () => h('p', timers.value.map((timer) => timer.name).join(', '))
  }
})

describe('giving components the stored timers', () => {
  test('a component below the one that provides the stored timers gets them', () => {
    const Provider = defineComponent({
      setup() {
        provideStoredTimers(createMemoryStoredTimers({ now: () => 0, timers: [tea] }))
        return () => h(TimerNames)
      }
    })

    render(Provider)

    expect(screen.getByText('Tea')).toBeInTheDocument()
  })

  test('a component with no provider above it is told what is missing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(() => render(TimerNames)).toThrow('useStoredTimers needs provideStoredTimers in an ancestor component')
  })
})
