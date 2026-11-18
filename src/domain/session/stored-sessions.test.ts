import { render, screen } from '@testing-library/vue'
import { defineComponent, h } from 'vue'
import { createMemoryBackground } from '@/infrastructure/memory/background'
import { createFocusSession } from './model/focus-session'
import { provideStoredSessions, useStoredSessions } from './stored-sessions'

const morning = createFocusSession({ id: 'morning', name: 'Morning', taskIds: [], stepLength: 1_500_000, breakLength: 300_000, order: 'alternating' }, [])

const SessionNames = defineComponent({
  setup() {
    const { sessions } = useStoredSessions()
    return () => h('p', sessions.value.map((session) => session.name).join(', '))
  }
})

describe('giving components the stored focus sessions', () => {
  test('a component below the one that provides the stored focus sessions gets them', () => {
    const Provider = defineComponent({
      setup() {
        provideStoredSessions(createMemoryBackground({ now: () => 0, sessions: [morning] }).storedSessions)
        return () => h(SessionNames)
      }
    })

    render(Provider)

    expect(screen.getByText('Morning')).toBeInTheDocument()
  })

  test('a component with no provider above it is told what is missing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(() => render(SessionNames)).toThrow('useStoredSessions needs provideStoredSessions in an ancestor component')
  })
})
