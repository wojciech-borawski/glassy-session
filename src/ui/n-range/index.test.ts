import { fireEvent, render, screen } from '@testing-library/vue'
import NRange from './index.vue'

describe('NRange', () => {
  test('is a slider named by its label that shows its value', () => {
    render(NRange, { props: { label: 'Volume', modelValue: 0.5, min: 0, max: 1, step: 0.05 } })

    expect(screen.getByRole('slider', { name: 'Volume' })).toHaveValue('0.5')
  })

  test('reports where it is moved to as a number', async () => {
    const { emitted } = render(NRange, { props: { label: 'Volume', modelValue: 0.5, min: 0, max: 1, step: 0.05 } })

    await fireEvent.update(screen.getByRole('slider', { name: 'Volume' }), '0.75')

    expect(emitted('update:modelValue')).toEqual([[0.75]])
  })
})
