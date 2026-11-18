import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import NSwitch from './index.vue'

describe('NSwitch', () => {
  test('is a switch named by its label that tells whether it is on', () => {
    render(NSwitch, { props: { label: 'System notification', modelValue: true } })

    expect(screen.getByRole('switch', { name: 'System notification' })).toBeChecked()
  })

  test('asks to flip when clicked, or when Space or Enter is pressed on it', async () => {
    const { emitted } = render(NSwitch, { props: { label: 'Sound', modelValue: false } })
    const toggle = screen.getByRole('switch', { name: 'Sound' })

    await userEvent.click(toggle)
    toggle.focus()
    await userEvent.keyboard(' ')
    await userEvent.keyboard('{Enter}')

    expect(emitted('update:modelValue')).toEqual([[true], [true], [true]])
  })
})
