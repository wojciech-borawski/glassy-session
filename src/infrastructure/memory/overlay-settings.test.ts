import { createMemoryOverlaySettings } from './overlay-settings'

describe('overlay settings kept in memory', () => {
  test('start as given, and a change sets the fields it names and keeps the others', async () => {
    const stored = createMemoryOverlaySettings({ shownOnPages: true, corner: 'top right', offset: { x: 12, y: 12 }, collapsed: false })

    await stored.change({ collapsed: true })

    expect(stored.settings.value).toEqual({ shownOnPages: true, corner: 'top right', offset: { x: 12, y: 12 }, collapsed: true })
  })

  test('keep a position the overlay was dropped at', async () => {
    const stored = createMemoryOverlaySettings()

    await stored.change({ corner: 'bottom left', offset: { x: 340, y: 96 } })

    expect(stored.settings.value).toEqual({ shownOnPages: true, corner: 'bottom left', offset: { x: 340, y: 96 }, collapsed: false })
  })
})
