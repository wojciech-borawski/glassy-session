import { render } from '@testing-library/vue'
import NIcon from './index.vue'
import { icons } from './icons'

describe('NIcon', () => {
  test('draws the named icon, hidden from assistive technology', () => {
    const { container } = render(NIcon, { props: { name: 'play' } })

    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg?.querySelector('path')).toHaveAttribute('d', icons.play)
  })

  test('is drawn at the given size', () => {
    const { container } = render(NIcon, { props: { name: 'play', size: 14 } })

    expect(container.querySelector('svg')).toHaveAttribute('width', '14')
    expect(container.querySelector('svg')).toHaveAttribute('height', '14')
  })
})
