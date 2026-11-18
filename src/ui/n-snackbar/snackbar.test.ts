import { render, screen } from '@testing-library/vue'
import NSnackbar from './index.vue'
import { provideSnackbar, useSnackbar } from './snackbar'

function renderWithSnackbar() {
  let show: (text: string) => void = () => undefined
  render({
    components: { NSnackbar },
    setup() {
      const snackbar = provideSnackbar()
      return { messages: snackbar.messages }
    },
    template: '<NSnackbar :messages="messages" /><Child />'
  }, {
    global: {
      components: {
        Child: { setup() { show = useSnackbar().show; return () => null } }
      }
    }
  })
  return { show: (text: string) => show(text) }
}

describe('the snackbar', () => {
  test('shows what a component below the one that provides it asks to show', async () => {
    const { show } = renderWithSnackbar()

    show('Write report started')
    await nextTick()

    expect(screen.getByRole('status')).toHaveTextContent('Write report started')
  })

  test('takes each message away four seconds after it is shown', async () => {
    vi.useFakeTimers()
    const { show } = renderWithSnackbar()

    show('Write report started')
    vi.advanceTimersByTime(2_000)
    show('Tea added')
    vi.advanceTimersByTime(2_000)
    await nextTick()
    const afterFour = screen.getByRole('status').textContent?.trim()
    vi.advanceTimersByTime(2_000)
    await nextTick()

    expect(afterFour).toBe('Tea added')
    expect(screen.getByRole('status').textContent?.trim()).toBe('')
    vi.useRealTimers()
  })
})
