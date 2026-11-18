import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import NCheckbox from './index.vue'

describe('NCheckbox', () => {
  test('is a checkbox named by its label that tells whether it is ticked, with a hint below the label', () => {
    render(NCheckbox, { props: { label: 'Write report', hint: '50m left', modelValue: true } })

    expect(screen.getByRole('checkbox', { name: 'Write report' })).toBeChecked()
    expect(screen.getByText('50m left')).toBeInTheDocument()
  })

  test('asks to flip when clicked, or when Space is pressed on it', async () => {
    const { emitted } = render(NCheckbox, { props: { label: 'Write report', modelValue: false } })
    const box = screen.getByRole('checkbox', { name: 'Write report' })

    await userEvent.click(box)
    box.focus()
    await userEvent.keyboard(' ')

    expect(emitted('update:modelValue')).toEqual([[true], [true]])
  })
})
