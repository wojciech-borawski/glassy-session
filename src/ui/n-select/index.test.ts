import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import NSelect from './index.vue'

const options = [
  { value: 'alternate', label: 'Alternate' },
  { value: 'one-after-another', label: 'One after another' }
]

describe('NSelect', () => {
  test('is named by its label and shows the chosen option', () => {
    render(NSelect, { props: { label: 'Starting order', options, modelValue: 'one-after-another' } })

    expect(screen.getByRole('combobox', { name: 'Starting order' })).toHaveDisplayValue('One after another')
  })

  test('reports the option the person chooses', async () => {
    const { emitted } = render(NSelect, { props: { label: 'Starting order', options, modelValue: 'alternate' } })

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Starting order' }), 'One after another')

    expect(emitted('update:modelValue')).toEqual([['one-after-another']])
  })
})
