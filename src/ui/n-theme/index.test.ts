import { render, screen } from '@testing-library/vue'
import NTheme from './index.vue'

function themeOf(text: string) {
  return screen.getByText(text).closest('[data-theme]')
}

function fakeSystemColorScheme(prefersDark: boolean) {
  const listeners = new Set<() => void>()
  const query = {
    matches: prefersDark,
    addEventListener: (_type: 'change', listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: 'change', listener: () => void) => listeners.delete(listener)
  }
  const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue(query as unknown as MediaQueryList)
  return {
    matchMedia,
    listeners,
    change(nowPrefersDark: boolean) {
      query.matches = nowPrefersDark
      listeners.forEach(listener => listener())
    }
  }
}

describe('NTheme', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('puts the chosen theme on the element around its content', () => {
    render(NTheme, { props: { theme: 'lagoon', version: 'light' }, slots: { default: 'App' } })

    expect(themeOf('App')).toHaveAttribute('data-theme', 'lagoon')
  })

  test('uses the dark version when dark is chosen', () => {
    render(NTheme, { props: { theme: 'pebble', version: 'dark' }, slots: { default: 'App' } })

    expect(themeOf('App')).toHaveAttribute('data-version', 'dark')
  })

  test('uses the dark version when matching a system that prefers dark', () => {
    const system = fakeSystemColorScheme(true)

    render(NTheme, { props: { theme: 'frost', version: 'system' }, slots: { default: 'App' } })

    expect(system.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
    expect(themeOf('App')).toHaveAttribute('data-version', 'dark')
  })

  test('follows the system when its preference changes', async () => {
    const system = fakeSystemColorScheme(true)
    render(NTheme, { props: { theme: 'frost', version: 'system' }, slots: { default: 'App' } })

    system.change(false)
    await nextTick()

    expect(themeOf('App')).toHaveAttribute('data-version', 'light')
  })

  test('stops following the system once it is removed', () => {
    const system = fakeSystemColorScheme(true)
    const { unmount } = render(NTheme, { props: { theme: 'frost', version: 'system' }, slots: { default: 'App' } })

    unmount()

    expect(system.listeners.size).toBe(0)
  })
})
