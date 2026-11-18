import { render, screen } from '@testing-library/vue'
import NProgressLine from './index.vue'

const deepWork = [
  { length: 30, fill: 1, color: '#2f7dd1' },
  { length: 5, fill: 1, color: 'gray' },
  { length: 30, fill: 0.5, color: '#c2571a' },
  { length: 5, fill: 0, color: 'gray' }
]

describe('NProgressLine', () => {
  test('is a progress bar named by its label that tells how much of its whole length is filled', () => {
    render(NProgressLine, { props: { label: 'Deep work', segments: deepWork } })

    expect(screen.getByRole('progressbar', { name: 'Deep work' })).toHaveAttribute('aria-valuenow', '71')
  })

  test('reports nothing filled when it has no segments', () => {
    render(NProgressLine, { props: { label: 'Empty plan', segments: [] } })

    expect(screen.getByRole('progressbar', { name: 'Empty plan' })).toHaveAttribute('aria-valuenow', '0')
  })

  test('draws one segment per entry, sized by its length and filled by its own fraction and colour', () => {
    render(NProgressLine, { props: { label: 'Deep work', segments: deepWork } })

    const segments = Array.from(screen.getByRole('progressbar', { name: 'Deep work' }).children) as HTMLElement[]
    const fills = segments.map(segment => segment.firstElementChild as HTMLElement)
    expect(segments.map(segment => segment.style.flexGrow)).toEqual(['30', '5', '30', '5'])
    expect(fills.map(fill => fill.style.width)).toEqual(['100%', '100%', '50%', '0%'])
    expect(segments[2]?.style.getPropertyValue('--n-segment-color')).toBe('#c2571a')
  })
})
