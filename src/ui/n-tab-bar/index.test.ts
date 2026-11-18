import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import NTabBar from './index.vue'

const tabs = [
  { id: 'today', label: 'Today', icon: 'sun' },
  { id: 'timers', label: 'Timers', icon: 'stopwatch' },
  { id: 'settings', label: 'Settings', icon: 'sliders' }
] as const

describe('NTabBar', () => {
  test('is a navigation named by its label with a button per tab', () => {
    render(NTabBar, { props: { label: 'Places', tabs, current: 'today' } })

    const places = screen.getByRole('navigation', { name: 'Places' })
    expect(within(places).getAllByRole('button').map(button => button.textContent?.trim())).toEqual(['Today', 'Timers', 'Settings'])
  })

  test('marks only the current tab as the current page', () => {
    render(NTabBar, { props: { label: 'Places', tabs, current: 'timers' } })

    expect(screen.getByRole('button', { name: 'Timers' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Today' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('button', { name: 'Settings' })).not.toHaveAttribute('aria-current')
  })

  test('asks to go to a tab when it is clicked or pressed with the keyboard', async () => {
    const { emitted } = render(NTabBar, { props: { label: 'Places', tabs, current: 'today' } })

    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    screen.getByRole('button', { name: 'Timers' }).focus()
    await userEvent.keyboard('{Enter}')

    expect(emitted('select')).toEqual([['settings'], ['timers']])
  })
})
