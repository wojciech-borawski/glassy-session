import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import NDayPicker from './index.vue'

function renderDayPicker(chosen: number[]) {
  return render(NDayPicker, {
    props: { label: 'Repeat days', modelValue: chosen },
    global: { plugins: [createAppI18n()] }
  })
}

describe('NDayPicker', () => {
  test('is a group named by its label with one button per day of the week, from Monday to Sunday', () => {
    renderDayPicker([])

    const group = screen.getByRole('group', { name: 'Repeat days' })
    const buttons = Array.from(group.querySelectorAll('button'))
    expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    expect(buttons.map(button => button.textContent?.trim())).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S'])
  })

  test('shows the chosen days as pressed', () => {
    renderDayPicker([1, 5])

    expect(screen.getByRole('button', { name: 'Monday' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Friday' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Sunday' })).toHaveAttribute('aria-pressed', 'false')
  })

  test('adds a day in week order when it is clicked or pressed with the keyboard', async () => {
    const { emitted } = renderDayPicker([1, 5])

    await userEvent.click(screen.getByRole('button', { name: 'Wednesday' }))
    screen.getByRole('button', { name: 'Sunday' }).focus()
    await userEvent.keyboard(' ')

    expect(emitted('update:modelValue')).toEqual([[[1, 3, 5]], [[0, 1, 5]]])
  })

  test('removes a chosen day when it is pressed', async () => {
    const { emitted } = renderDayPicker([1, 3, 5])

    await userEvent.click(screen.getByRole('button', { name: 'Wednesday' }))

    expect(emitted('update:modelValue')).toEqual([[[1, 5]]])
  })
})
