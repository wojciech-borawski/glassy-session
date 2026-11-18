import { render } from '@testing-library/vue'
import NSwatch from './index.vue'

describe('NSwatch', () => {
  test('draws the colour it is named, with the initial on it, hidden from assistive technology', () => {
    const { container } = render(NSwatch, { props: { colour: 'teal', initial: 'T' } })

    const swatch = container.firstElementChild as HTMLElement
    expect(swatch).toHaveAttribute('aria-hidden', 'true')
    expect(swatch.style.backgroundColor).toBe('#1f9aa3')
    expect(swatch).toHaveTextContent('T')
  })
})
