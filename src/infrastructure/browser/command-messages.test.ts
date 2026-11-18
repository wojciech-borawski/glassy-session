import { fakeBrowser } from 'wxt/testing/fake-browser'
import { sendTimerCommand } from './timer-commands'

beforeEach(() => {
  fakeBrowser.reset()
})

describe('sending a command to the background', () => {
  test('resolves as a failure when no background answers', async () => {
    const refusal = await sendTimerCommand({ type: 'start', timerId: 'tea' })

    expect(refusal).toMatchObject({ reason: 'failed' })
  })

  test('resolves as a failure when the background answers with something that is not a command answer', async () => {
    browser.runtime.onMessage.addListener(() => Promise.resolve(null))

    const refusal = await sendTimerCommand({ type: 'start', timerId: 'tea' })

    expect(refusal).toEqual({ reason: 'failed', message: 'The background did not answer' })
  })
})
