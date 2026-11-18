import { createMemoryOverlaySettings } from './overlay-settings'

describe('overlay settings kept in memory', () => {
  test('start as given, and a change sets the fields it names and keeps the others', async () => {
    const stored = createMemoryOverlaySettings({ shownOnPages: true, corner: 'top right', collapsed: false })

    await stored.change({ collapsed: true })

    expect(stored.settings.value).toEqual({ shownOnPages: true, corner: 'top right', collapsed: true })
  })
})
