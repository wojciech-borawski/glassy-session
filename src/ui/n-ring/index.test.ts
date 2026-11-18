import { render, screen } from '@testing-library/vue'
import NRing from './index.vue'

describe('NRing', () => {
  test('is a progress bar named by its label, with its centre content inside', () => {
    render(NRing, { props: { label: 'Deep work focus step', value: 0.25 }, slots: { default: '22:30' } })

    const ring = screen.getByRole('progressbar', { name: 'Deep work focus step' })
    expect(ring).toHaveAttribute('aria-valuenow', '25')
    expect(ring).toHaveTextContent('22:30')
  })

  test('draws its arc over the filled share of the circle', () => {
    const { container } = render(NRing, { props: { label: 'Focus step', value: 0.25, size: 128 } })

    const arc = container.querySelectorAll('circle')[1]
    const circumference = Number(arc?.getAttribute('stroke-dasharray'))
    const gap = Number(arc?.getAttribute('stroke-dashoffset'))
    expect(circumference).toBeCloseTo(2 * Math.PI * 57)
    expect(gap / circumference).toBeCloseTo(0.75)
  })
})
