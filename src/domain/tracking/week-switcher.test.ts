import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import WeekSwitcher from './week-switcher.vue'

const week = { first: '2026-11-16', last: '2026-11-22' }

function renderSwitcher(canGoBack = true, canGoForward = true) {
  return render(WeekSwitcher, { props: { week, canGoBack, canGoForward }, global: { plugins: [createAppI18n()] } })
}

describe('the week switcher', () => {
  test('names the week it shows by its first and last day', () => {
    renderSwitcher()

    expect(screen.getByRole('heading', { name: 'Nov 16\u2009–\u200922, 2026' })).toBeInTheDocument()
  })

  test('asks for the week before and the week after', async () => {
    const { emitted } = renderSwitcher()

    await userEvent.click(screen.getByRole('button', { name: 'Week before' }))
    await userEvent.click(screen.getByRole('button', { name: 'Week after' }))

    expect(Object.keys(emitted())).toEqual(expect.arrayContaining(['back', 'forward']))
    expect(emitted('back')).toHaveLength(1)
    expect(emitted('forward')).toHaveLength(1)
  })

  test('cannot be moved to a week that is not available', async () => {
    const { emitted } = renderSwitcher(false, false)

    await userEvent.click(screen.getByRole('button', { name: 'Week before' }))
    await userEvent.click(screen.getByRole('button', { name: 'Week after' }))

    expect(screen.getByRole('button', { name: 'Week before' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Week after' })).toBeDisabled()
    expect(emitted('back')).toBeUndefined()
    expect(emitted('forward')).toBeUndefined()
  })
})
