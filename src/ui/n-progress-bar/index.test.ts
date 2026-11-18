import { render, screen } from '@testing-library/vue'
import NProgressBar from './index.vue'

describe('NProgressBar', () => {
  test('is a progress bar named by its label that tells how far it is filled', () => {
    render(NProgressBar, { props: { label: 'Job 1', value: 0.4 } })

    const bar = screen.getByRole('progressbar', { name: 'Job 1' })
    expect(bar).toHaveAttribute('aria-valuenow', '40')
  })

  test('never reports less than empty or more than full', () => {
    render(NProgressBar, { props: { label: 'Over', value: 1.3 } })
    render(NProgressBar, { props: { label: 'Under', value: -0.2 } })

    expect(screen.getByRole('progressbar', { name: 'Over' })).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByRole('progressbar', { name: 'Under' })).toHaveAttribute('aria-valuenow', '0')
  })
})
