import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createBrowserOverlaySettings } from './overlay-settings'

beforeEach(() => {
  fakeBrowser.reset()
})

describe('the overlay settings as the browser keeps them', () => {
  test('show the overlay in the bottom right corner, expanded, while nothing is stored', async () => {
    const { settings } = createBrowserOverlaySettings()

    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(settings.value).toEqual({ shownOnPages: true, corner: 'bottom right', collapsed: false })
  })

  test('a change saves the fields it names, keeps the others, and every page following the settings sees it', async () => {
    const onePage = createBrowserOverlaySettings()
    const otherPage = createBrowserOverlaySettings()

    await onePage.change({ corner: 'top left' })
    await onePage.change({ collapsed: true })

    await vi.waitFor(() => expect(otherPage.settings.value).toEqual({ shownOnPages: true, corner: 'top left', collapsed: true }))
    expect(await fakeBrowser.storage.local.get('overlaySettings')).toEqual({ overlaySettings: { shownOnPages: true, corner: 'top left', collapsed: true } })
  })

  test('a stored field this version does not know stands in as its default, and the fields it knows are kept', async () => {
    await fakeBrowser.storage.local.set({ overlaySettings: { shownOnPages: 'yes', corner: 'top left', collapsed: true } })
    const { settings } = createBrowserOverlaySettings()

    await vi.waitFor(() => expect(settings.value.corner).toBe('top left'))
    expect(settings.value).toEqual({ shownOnPages: true, corner: 'top left', collapsed: true })

    await fakeBrowser.storage.local.set({ overlaySettings: { corner: 'middle', collapsed: false } })
    await vi.waitFor(() => expect(settings.value).toEqual({ shownOnPages: true, corner: 'bottom right', collapsed: false }))
  })
})
