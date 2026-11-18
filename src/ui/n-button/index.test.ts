import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import NButton from './index.vue'

describe('NButton', () => {
  test('acts on click', async () => {
    const onClick = vi.fn()
    render(NButton, { attrs: { onClick }, slots: { default: 'Start' } })

    await userEvent.click(screen.getByRole('button', { name: 'Start' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  test('is named by its label when it shows only an icon', () => {
    render(NButton, { props: { icon: 'rotate-left', label: 'Reset Job 1' } })

    expect(screen.getByRole('button', { name: 'Reset Job 1' })).toBeInTheDocument()
  })

  test('tells assistive technology whether it is pressed when it is a toggle', () => {
    render(NButton, { props: { pressed: true }, slots: { default: 'Dark' } })
    render(NButton, { props: { pressed: false }, slots: { default: 'Light' } })
    render(NButton, { slots: { default: 'Save' } })

    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Save' })).not.toHaveAttribute('aria-pressed')
  })
})
