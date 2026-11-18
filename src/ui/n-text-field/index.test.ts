import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import NTextField from './index.vue'

describe('NTextField', () => {
  test('is named by its label', () => {
    render(NTextField, { props: { label: 'Name', modelValue: '' } })

    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument()
  })

  test('shows its value and reports what is typed', async () => {
    const { emitted } = render(NTextField, { props: { label: 'Name', modelValue: 'Job' } })

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), ' 3')

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Job 3')
    expect(emitted('update:modelValue')?.at(-1)).toEqual(['Job 3'])
  })

  test('says what is wrong next to it and is marked as invalid, only while there is something wrong', async () => {
    const { rerender } = render(NTextField, { props: { label: 'Name', modelValue: '', error: 'Give it a name.' } })
    const field = screen.getByRole('textbox', { name: 'Name' })
    const whileWrong = { invalid: field.getAttribute('aria-invalid'), description: document.getElementById(field.getAttribute('aria-describedby') ?? '')?.textContent }

    await rerender({ error: undefined })

    expect(whileWrong.invalid).toBe('true')
    expect(whileWrong.description).toBe('Give it a name.')
    expect(field).not.toHaveAttribute('aria-invalid')
    expect(field).not.toHaveAccessibleDescription()
  })
})
