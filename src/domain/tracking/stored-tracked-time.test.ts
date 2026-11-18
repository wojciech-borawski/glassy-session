import { render, screen } from '@testing-library/vue'
import { defineComponent, h } from 'vue'
import { createMemoryStoredTrackedTime } from '@/infrastructure/memory/stored-tracked-time'
import { provideStoredTrackedTime, useStoredTrackedTime } from './stored-tracked-time'

const TrackedTasks = defineComponent({
  setup() {
    const { trackedTime } = useStoredTrackedTime()
    return () => h('p', Object.keys(trackedTime.value).join(', '))
  }
})

describe('giving components the stored tracked time', () => {
  test('a component below the one that provides the stored tracked time gets it', () => {
    const Provider = defineComponent({
      setup() {
        provideStoredTrackedTime(createMemoryStoredTrackedTime({ 'write-report': { '2026-11-17': 600_000 } }))
        return () => h(TrackedTasks)
      }
    })

    render(Provider)

    expect(screen.getByText('write-report')).toBeInTheDocument()
  })

  test('a component with no provider above it is told what is missing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(() => render(TrackedTasks)).toThrow('useStoredTrackedTime needs provideStoredTrackedTime in an ancestor component')
  })
})
