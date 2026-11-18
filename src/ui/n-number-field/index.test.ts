import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import NNumberField from './index.vue'

describe('NNumberField', () => {
  test('is named by its label and shows its value', () => {
    render(NNumberField, { props: { label: 'Hours', modelValue: 2 } })

    expect(screen.getByRole('spinbutton', { name: 'Hours' })).toHaveValue(2)
  })

  test('reports what is typed as a number', async () => {
    const { emitted } = render(NNumberField, { props: { label: 'Minutes', modelValue: 0 } })
    const field = screen.getByRole('spinbutton', { name: 'Minutes' })

    await userEvent.clear(field)
    await userEvent.type(field, '25')

    expect(emitted('update:modelValue')?.at(-1)).toEqual([25])
  })

  test('reports nothing while the field is empty', async () => {
    const { emitted } = render(NNumberField, { props: { label: 'Minutes', modelValue: 5 } })

    await userEvent.clear(screen.getByRole('spinbutton', { name: 'Minutes' }))

    expect(emitted('update:modelValue')).toBeUndefined()
  })

  test('keeps what it reports between its minimum and maximum', async () => {
    const { emitted } = render(NNumberField, { props: { label: 'Minutes', modelValue: 0, min: 0, max: 59 } })
    const field = screen.getByRole('spinbutton', { name: 'Minutes' })

    await userEvent.clear(field)
    await userEvent.type(field, '75')
    const afterTooMuch = emitted('update:modelValue')?.at(-1)
    await userEvent.clear(field)
    await userEvent.type(field, '-3')

    expect(afterTooMuch).toEqual([59])
    expect(emitted('update:modelValue')?.at(-1)).toEqual([0])
  })
})
