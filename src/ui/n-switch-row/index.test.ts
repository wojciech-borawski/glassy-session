import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import NSwitchRow from './index.vue'

describe('NSwitchRow', () => {
  test('shows its label and hint beside a switch named by the label and described by the hint', () => {
    render(NSwitchRow, { props: { label: 'Show in the overlay', hint: 'On every page', modelValue: true } })

    const toggle = screen.getByRole('switch', { name: 'Show in the overlay' })
    expect(toggle).toBeChecked()
    expect(toggle).toHaveAccessibleDescription('On every page')
    expect(screen.getByText('Show in the overlay', { selector: 'span' })).toBeInTheDocument()
  })

  test('asks to flip when its switch is clicked', async () => {
    const { emitted } = render(NSwitchRow, { props: { label: 'Sound', hint: 'Plays a ring', modelValue: false } })

    await userEvent.click(screen.getByRole('switch', { name: 'Sound' }))

    expect(emitted('update:modelValue')).toEqual([[true]])
  })
})
