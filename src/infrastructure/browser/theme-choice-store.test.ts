import { fakeBrowser } from 'wxt/testing/fake-browser'
import { readThemeChoice, saveThemeChoice, watchThemeChoice } from './theme-choice-store'

beforeEach(() => {
  fakeBrowser.reset()
})

describe('the saved theme choice', () => {
  test('falls back to Frost matching the system for a theme or version this version does not have', async () => {
    await fakeBrowser.storage.local.set({ themeChoice: { theme: 'sunset', version: 'dim' } })

    expect(await readThemeChoice()).toEqual({ theme: 'frost', version: 'system' })
  })

  test('tells each choice saved after it starts watching, with the same fallback for what this version does not have', async () => {
    const heard: unknown[] = []
    watchThemeChoice((choice) => heard.push(choice))

    await saveThemeChoice({ theme: 'lagoon', version: 'dark' })
    await fakeBrowser.storage.local.set({ themeChoice: { theme: 'sunset', version: 'light' } })

    await vi.waitFor(() => expect(heard).toEqual([{ theme: 'lagoon', version: 'dark' }, { theme: 'frost', version: 'light' }]))
  })
})
