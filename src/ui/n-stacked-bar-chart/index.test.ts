import { render, screen, within } from '@testing-library/vue'
import NStackedBarChart from './index.vue'

const week = [
  { key: 'mon', label: 'Mon', total: '2h', description: 'Monday: 2h', parts: [{ value: 90, colour: '#2f7dd1' }, { value: 30, colour: '#c2571a' }] },
  { key: 'tue', label: 'Tue', total: '0m', description: 'Tuesday: nothing tracked', parts: [] },
  { key: 'wed', label: 'Wed', total: '1h', description: 'Wednesday: 1h', current: true, parts: [{ value: 60, colour: '#c2571a' }] }
]

/** The text a screen reader reads in an element: everything outside the parts hidden from it. */
function spokenText(element: Element): string {
  if (element.getAttribute('aria-hidden') === 'true') return ''
  return Array.from(element.childNodes)
    .map(node => node instanceof Element ? spokenText(node) : node.textContent ?? '')
    .join('')
    .trim()
}

describe('NStackedBarChart', () => {
  test('is a list named by its label with one item per bar, which a screen reader reads as the bar\'s description', () => {
    render(NStackedBarChart, { props: { label: 'Tracked time per day', bars: week } })

    const items = within(screen.getByRole('list', { name: 'Tracked time per day' })).getAllByRole('listitem')
    expect(items.map(spokenText)).toEqual(['Monday: 2h', 'Tuesday: nothing tracked', 'Wednesday: 1h'])
  })

  test('shows each bar\'s total above it and its label below it as text, without hovering', () => {
    render(NStackedBarChart, { props: { label: 'Tracked time per day', bars: week } })

    const monday = within(screen.getByRole('list', { name: 'Tracked time per day' })).getAllByRole('listitem')[0] as HTMLElement
    const shown = Array.from(monday.querySelectorAll('[aria-hidden="true"]')).map(element => element.textContent?.trim()).filter(Boolean)
    expect(shown).toEqual(['2h', 'Mon'])
  })

  test('stacks each bar\'s parts from the bottom in their own colours, sized against the tallest bar, and draws an empty track for a bar with nothing', () => {
    const { container } = render(NStackedBarChart, { props: { label: 'Tracked time per day', bars: week } })

    const tracks = Array.from(container.querySelectorAll('.n-stacked-bar-chart__track'))
    const parts = tracks.map(track => Array.from(track.children as HTMLCollectionOf<HTMLElement>).map(part => [part.style.height, part.style.backgroundColor]))
    expect(parts).toEqual([
      [['75%', '#2f7dd1'], ['25%', '#c2571a']],
      [],
      [['50%', '#c2571a']]
    ])
  })

  test('marks the current bar, and only that one', () => {
    render(NStackedBarChart, { props: { label: 'Tracked time per day', bars: week } })

    const items = within(screen.getByRole('list', { name: 'Tracked time per day' })).getAllByRole('listitem')
    expect(items.map(item => item.getAttribute('aria-current'))).toEqual([null, null, 'true'])
  })
})
