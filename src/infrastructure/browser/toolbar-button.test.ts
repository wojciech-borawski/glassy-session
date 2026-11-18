import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createBrowserToolbarButton } from './toolbar-button'

beforeEach(() => {
  fakeBrowser.reset()
})

/** Firefox's Manifest V2 build has no `action`, only the `browserAction` it replaced. This one keeps each call it is given. */
function asInFirefox() {
  const calls: (readonly [string, unknown])[] = []
  const keep = (name: string) => async (details: unknown) => {
    calls.push([name, details])
  }
  const browserAction = { setBadgeText: keep('setBadgeText'), setBadgeBackgroundColor: keep('setBadgeBackgroundColor'), setBadgeTextColor: keep('setBadgeTextColor') }
  const action = Object.getOwnPropertyDescriptor(fakeBrowser, 'action')
  const replaced = Object.getOwnPropertyDescriptor(fakeBrowser, 'browserAction')
  Object.defineProperty(fakeBrowser, 'action', { value: undefined, configurable: true })
  Object.defineProperty(fakeBrowser, 'browserAction', { value: browserAction, configurable: true })
  onTestFinished(() => {
    Object.defineProperty(fakeBrowser, 'action', action ?? {})
    Object.defineProperty(fakeBrowser, 'browserAction', replaced ?? {})
  })
  return calls
}

describe('the browser toolbar button', () => {
  test('shows the badge\'s text on a running colour', async () => {
    await createBrowserToolbarButton().showBadge({ text: '2', look: 'running' })

    expect(await browser.action.getBadgeText({})).toBe('2')
    expect(await browser.action.getBadgeBackgroundColor({})).toEqual([194, 65, 12, 255])
  })

  test('shows a calmer colour for the break look', async () => {
    await createBrowserToolbarButton().showBadge({ text: '1', look: 'on break' })

    expect(await browser.action.getBadgeBackgroundColor({})).toEqual([21, 128, 61, 255])
  })

  test('takes the badge away for no badge', async () => {
    const button = createBrowserToolbarButton()
    await button.showBadge({ text: '1', look: 'running' })

    await button.showBadge(null)

    expect(await browser.action.getBadgeText({})).toBe('')
  })

  test('writes the badge\'s text in white', async () => {
    await browser.action.setBadgeTextColor({ color: '#000000' })

    await createBrowserToolbarButton().showBadge({ text: '1', look: 'running' })

    expect(await browser.action.getBadgeTextColor({})).toBe('#FFFFFF')
  })

  test('shows the badge through the browser action where there is no action, as in the Manifest V2 build for Firefox', async () => {
    const calls = asInFirefox()

    await createBrowserToolbarButton().showBadge({ text: '3', look: 'on break' })

    expect(calls).toEqual([
      ['setBadgeText', { text: '3' }],
      ['setBadgeBackgroundColor', { color: '#15803D' }],
      ['setBadgeTextColor', { color: '#FFFFFF' }]
    ])
  })

  test('logs a badge the browser refuses to show, and never rejects', async () => {
    const refused = new Error('No toolbar button')
    vi.spyOn(browser.action, 'setBadgeText').mockRejectedValueOnce(refused)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(createBrowserToolbarButton().showBadge({ text: '1', look: 'running' })).resolves.toBeUndefined()

    expect(console.error).toHaveBeenCalledWith(refused)
  })
})
