import { render, screen } from '@testing-library/vue'
import { defineComponent, h } from 'vue'
import { createManualClock } from '@/infrastructure/memory/display-clock'
import { provideDisplayClock, useDisplayClock } from './display-clock'

const ShowsTheMoment = defineComponent({
  setup() {
    const now = useDisplayClock()
    return () => h('p', `It is ${now.value}`)
  }
})

describe('the display clock', () => {
  test('components below its provider redraw as it moves', async () => {
    const clock = createManualClock(1_000)
    const Provider = defineComponent({
      setup() {
        provideDisplayClock(clock.now)
        return () => h(ShowsTheMoment)
      }
    })
    render(Provider)

    clock.advanceBy(500)

    expect(await screen.findByText('It is 1500')).toBeInTheDocument()
  })

  test('a component with no provider above it is told what is missing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(() => render(ShowsTheMoment)).toThrow('useDisplayClock needs provideDisplayClock in an ancestor component')
  })
})
