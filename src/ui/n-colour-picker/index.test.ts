import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import NColourPicker from './index.vue'

function renderPicker() {
  return render(NColourPicker, { props: { label: 'Colour', modelValue: 'teal' }, global: { plugins: [createAppI18n()] } })
}

describe('NColourPicker', () => {
  test('is a group named by its label with a choice named for each colour, the chosen one checked', () => {
    renderPicker()

    const group = screen.getByRole('radiogroup', { name: 'Colour' })
    expect(within(group).getAllByRole('radio').map((radio) => radio.getAttribute('aria-label')))
      .toEqual(['Blue', 'Orange', 'Green', 'Gold', 'Violet', 'Pink', 'Teal'])
    expect(screen.getByRole('radio', { name: 'Teal' })).toBeChecked()
  })

  test('reports the colour the person chooses, by pointer or by keyboard', async () => {
    const { emitted } = renderPicker()

    await userEvent.click(screen.getByRole('radio', { name: 'Violet' }))
    screen.getByRole('radio', { name: 'Gold' }).focus()
    await userEvent.keyboard(' ')

    expect(emitted('update:modelValue')).toEqual([['violet'], ['gold']])
  })
})
