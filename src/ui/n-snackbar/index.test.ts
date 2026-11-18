import { render, screen } from '@testing-library/vue'
import NSnackbar from './index.vue'

describe('NSnackbar', () => {
  test('is a status region, present before any message, that shows each message', async () => {
    const { rerender } = render(NSnackbar, { props: { messages: [] } })
    const region = screen.getByRole('status')

    await rerender({ messages: [{ id: 1, text: 'Job 1 is done' }, { id: 2, text: 'Break. Next: Job 2' }] })

    expect(region).toHaveTextContent('Job 1 is done')
    expect(region).toHaveTextContent('Break. Next: Job 2')
  })
})
