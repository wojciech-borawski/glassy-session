import { render, screen } from '@testing-library/vue'
import NFieldset from './index.vue'

describe('NFieldset', () => {
  test('is a group named by its legend, with its fields inside', () => {
    render(NFieldset, { props: { legend: 'Planned time' }, slots: { default: '<input aria-label="Hours">' } })

    const group = screen.getByRole('group', { name: 'Planned time' })
    expect(group).toContainElement(screen.getByRole('textbox', { name: 'Hours' }))
  })

  test('says what is wrong with its fields together, below them', () => {
    render(NFieldset, { props: { legend: 'Planned time', error: 'The planned time must be more than zero.' } })

    expect(screen.getByRole('group', { name: 'Planned time' })).toHaveAccessibleDescription('The planned time must be more than zero.')
  })
})
