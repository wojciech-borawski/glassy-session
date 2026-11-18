import { render, screen } from '@testing-library/vue'
import NCard from './index.vue'

describe('NCard', () => {
  test('can be a button, so a card can be chosen with the keyboard', () => {
    render(NCard, { props: { as: 'button' }, slots: { default: 'Frost' } })

    expect(screen.getByRole('button', { name: 'Frost' })).toBeInTheDocument()
  })
})
