import { fireEvent, render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { h } from 'vue'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import type { OverlayPosition } from './model/overlay-settings'
import OverlayPanel from './overlay-panel.vue'

const bottomRight: OverlayPosition = { corner: 'bottom right', offset: { x: 12, y: 12 } }

function renderPanel(props: { position?: OverlayPosition, collapsed?: boolean, count?: number } = {}) {
  return render(OverlayPanel, {
    props: { position: bottomRight, collapsed: false, count: 1, ...props },
    slots: { default: () => [h('li', 'Tea 3:00'), h('li', [h('button', { type: 'button' }, 'Start Nap')])] },
    global: { plugins: [createAppI18n()] }
  })
}

/** Gives the page the size and the panel the box the browser would lay out, which the test DOM does not. */
function layOut(element: HTMLElement, box: Readonly<{ left: number, top: number, width: number, height: number }>, page = { width: 1024, height: 768 }) {
  window.innerWidth = page.width
  window.innerHeight = page.height
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ ...box, x: box.left, y: box.top, right: box.left + box.width, bottom: box.top + box.height, toJSON: () => box })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('the overlay panel', () => {
  test('shows what is pinned in a region, and asks to collapse when Collapse is chosen', async () => {
    const { emitted } = renderPanel()

    const panel = screen.getByRole('region', { name: 'Pinned timers and focus sessions' })
    expect(within(panel).getByText('Tea 3:00')).toBeInTheDocument()
    await userEvent.click(within(panel).getByRole('button', { name: 'Collapse the overlay' }))

    expect(emitted('collapse')).toHaveLength(1)
  })

  test('collapsed, shows only a pill saying how many are pinned, and asks to expand when it is chosen', async () => {
    const { emitted } = renderPanel({ collapsed: true, count: 2 })

    expect(screen.queryByText('Tea 3:00')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Collapse the overlay' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Show the overlay, 2 pinned' }))

    expect(emitted('expand')).toHaveLength(1)
  })

  test('with move mode off, cannot be moved: a drag across the page moves nothing', async () => {
    const { emitted } = renderPanel()

    expect(screen.getByRole('button', { name: 'Move the overlay', pressed: false })).toBeInTheDocument()
    await fireEvent.pointerDown(screen.getByText('Pinned'), { pointerId: 1, clientX: 1000, clientY: 740 })
    await fireEvent.pointerMove(window, { pointerId: 1, clientX: 400, clientY: 300 })
    await fireEvent.pointerUp(window, { pointerId: 1, clientX: 100, clientY: 100 })

    expect(emitted('move')).toBeUndefined()
    expect(screen.getByRole('region')).not.toHaveStyle({ translate: '-600px -440px' })
  })

  test('with move mode on, dragged by any part that is not a control and dropped, asks to stay exactly where it was dropped', async () => {
    const { emitted } = renderPanel()
    const panel = screen.getByRole('region')
    layOut(panel, { left: 752, top: 556, width: 260, height: 200 })

    await userEvent.click(screen.getByRole('button', { name: 'Move the overlay', pressed: false }))
    expect(screen.getByRole('button', { name: 'Move the overlay', pressed: true })).toBeInTheDocument()
    await fireEvent.pointerDown(screen.getByText('Pinned'), { pointerId: 1, clientX: 900, clientY: 600 })
    await fireEvent.pointerMove(window, { pointerId: 1, clientX: 500, clientY: 300 })
    expect(panel).toHaveStyle({ translate: '-400px -300px' })
    await fireEvent.pointerUp(window, { pointerId: 1, clientX: 300, clientY: 200 })

    expect(emitted('move')).toEqual([[{ corner: 'top left', offset: { x: 152, y: 156 } }]])
  })

  test('dropped, shows where it was dropped while the position is being saved, and then where the saved position puts it', async () => {
    const { rerender } = renderPanel()
    const panel = screen.getByRole('region')
    layOut(panel, { left: 752, top: 556, width: 260, height: 200 })

    await userEvent.click(screen.getByRole('button', { name: 'Move the overlay' }))
    await fireEvent.pointerDown(screen.getByText('Pinned'), { pointerId: 1, clientX: 900, clientY: 600 })
    await fireEvent.pointerUp(window, { pointerId: 1, clientX: 300, clientY: 200 })

    expect(panel).toHaveStyle({ top: '156px', left: '152px', translate: '0px 0px' })
    await rerender({ position: { corner: 'top right', offset: { x: 40, y: 30 } } })
    expect(panel).toHaveStyle({ top: '30px', right: '40px' })
  })

  test('in move mode, a drag ends on Escape pressed inside the overlay, whose keys the shadow root keeps from the page', async () => {
    const { container, emitted } = renderPanel()
    container.addEventListener('keydown', (event) => event.stopPropagation())
    const panel = screen.getByRole('region')
    layOut(panel, { left: 752, top: 556, width: 260, height: 200 })
    const toggle = screen.getByRole('button', { name: 'Move the overlay' })
    await userEvent.click(toggle)

    await fireEvent.pointerDown(screen.getByText('Pinned'), { pointerId: 7, clientX: 900, clientY: 600 })
    await fireEvent.pointerMove(window, { pointerId: 7, clientX: 500, clientY: 300 })
    await fireEvent.keyDown(toggle, { key: 'Escape' })
    expect(panel).toHaveStyle({ translate: '0px 0px' })
    await fireEvent.pointerUp(window, { pointerId: 7, clientX: 300, clientY: 200 })

    expect(emitted('move')).toBeUndefined()
  })

  test('in move mode, holds on to the pointer of a drag, so a frame on the page it passes over does not take it', async () => {
    renderPanel()
    const panel = screen.getByRole('region')
    layOut(panel, { left: 752, top: 556, width: 260, height: 200 })
    const held: number[] = []
    Object.assign(panel, { setPointerCapture: (pointerId: number) => held.push(pointerId) })
    await userEvent.click(screen.getByRole('button', { name: 'Move the overlay' }))

    await fireEvent.pointerDown(screen.getByText('Pinned'), { pointerId: 7, clientX: 900, clientY: 600 })

    expect(held).toEqual([7])
  })

  test('with move mode turned off again, cannot be moved, and a drag under way ends where it started', async () => {
    const { emitted } = renderPanel()
    const panel = screen.getByRole('region')
    layOut(panel, { left: 752, top: 556, width: 260, height: 200 })
    const toggle = screen.getByRole('button', { name: 'Move the overlay' })

    await userEvent.click(toggle)
    await fireEvent.pointerDown(screen.getByText('Pinned'), { pointerId: 7, clientX: 900, clientY: 600 })
    await fireEvent.pointerMove(window, { pointerId: 7, clientX: 500, clientY: 300 })
    toggle.focus()
    await userEvent.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(panel).toHaveStyle({ translate: '0px 0px' })
    await fireEvent.pointerUp(window, { pointerId: 7, clientX: 300, clientY: 200 })
    await fireEvent.pointerDown(screen.getByText('Pinned'), { pointerId: 8, clientX: 900, clientY: 600 })
    await fireEvent.pointerUp(window, { pointerId: 8, clientX: 300, clientY: 200 })

    expect(emitted('move')).toBeUndefined()
  })

  test('in move mode, a drag ended by Escape, a cancelled pointer or the window losing focus moves nothing and goes back to where it started', async () => {
    const { emitted } = renderPanel()
    const panel = screen.getByRole('region')
    layOut(panel, { left: 752, top: 556, width: 260, height: 200 })
    await userEvent.click(screen.getByRole('button', { name: 'Move the overlay' }))
    const endings = [
      () => fireEvent.keyDown(window, { key: 'Escape' }),
      () => fireEvent.pointerCancel(window, { pointerId: 7 }),
      () => fireEvent.blur(window)
    ]

    for (const end of endings) {
      await fireEvent.pointerDown(screen.getByText('Pinned'), { pointerId: 7, clientX: 900, clientY: 600 })
      await fireEvent.pointerMove(window, { pointerId: 7, clientX: 100, clientY: 100 })
      await end()
      expect(panel).toHaveStyle({ translate: '0px 0px' })
      await fireEvent.pointerUp(window, { pointerId: 7, clientX: 100, clientY: 100 })
    }

    expect(emitted('move')).toBeUndefined()
    expect(screen.getByRole('button', { name: 'Move the overlay' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('in move mode, a press on a control inside it starts no drag and reaches the control', async () => {
    const { emitted } = renderPanel()
    const panel = screen.getByRole('region')
    layOut(panel, { left: 752, top: 556, width: 260, height: 200 })
    await userEvent.click(screen.getByRole('button', { name: 'Move the overlay' }))

    const presses: Event[] = []
    window.addEventListener('pointerdown', (event) => presses.push(event), { once: true })
    await fireEvent.pointerDown(screen.getByRole('button', { name: 'Start Nap' }), { pointerId: 7, clientX: 900, clientY: 600 })
    await fireEvent.pointerMove(window, { pointerId: 7, clientX: 500, clientY: 300 })
    expect(panel).toHaveStyle({ translate: '0px 0px' })
    await fireEvent.pointerUp(window, { pointerId: 7, clientX: 300, clientY: 200 })

    expect(presses.map((event) => event.defaultPrevented)).toEqual([false])
    expect(emitted('move')).toBeUndefined()
  })

  test('with the Move toggle on and focused, an arrow key moves it 8 pixels and Shift with an arrow key 32, and with it off they move nothing', async () => {
    const { emitted } = renderPanel()
    layOut(screen.getByRole('region'), { left: 752, top: 556, width: 260, height: 200 })
    const toggle = screen.getByRole('button', { name: 'Move the overlay' })

    toggle.focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(emitted('move')).toBeUndefined()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard('{ArrowLeft}{Shift>}{ArrowUp}{/Shift}')

    expect(emitted('move')).toEqual([
      [{ corner: 'bottom right', offset: { x: 20, y: 12 } }],
      [{ corner: 'bottom right', offset: { x: 20, y: 44 } }]
    ])
  })

  test('collapsed and opened again, has move mode off', async () => {
    const { rerender } = renderPanel()
    await userEvent.click(screen.getByRole('button', { name: 'Move the overlay' }))

    await rerender({ collapsed: true })
    await rerender({ collapsed: false })

    expect(screen.getByRole('button', { name: 'Move the overlay' })).toHaveAttribute('aria-pressed', 'false')
  })

  test('comes in from a saved position as far as it needs to stay whole inside the page, also when the window shrinks later', async () => {
    renderPanel({ position: { corner: 'top left', offset: { x: 900, y: 40 } } })
    const panel = screen.getByRole('region')

    layOut(panel, { left: 900, top: 40, width: 260, height: 200 })
    await fireEvent(window, new Event('resize'))
    expect(panel).toHaveStyle({ top: '40px', left: '764px' })
    layOut(panel, { left: 764, top: 40, width: 260, height: 200 }, { width: 800, height: 220 })
    await fireEvent(window, new Event('resize'))

    expect(panel).toHaveStyle({ top: '20px', left: '540px' })
  })

  test('comes in far enough to stay clear of the scrollbars of the page', async () => {
    renderPanel({ position: { corner: 'top left', offset: { x: 900, y: 600 } } })
    const panel = screen.getByRole('region')
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1009)
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(753)

    layOut(panel, { left: 900, top: 600, width: 260, height: 200 })
    await fireEvent(window, new Event('resize'))

    expect(panel).toHaveStyle({ top: '553px', left: '749px' })
  })

  test('collapsed and opened, the pill and the panel each come in only as far as their own size needs', async () => {
    window.innerWidth = 1024
    window.innerHeight = 768
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.matches('section') ? { width: 260, height: 200 } as DOMRect : { width: 100, height: 32 } as DOMRect
    })
    const { rerender } = renderPanel({ position: { corner: 'top left', offset: { x: 900, y: 40 } } })
    await vi.waitFor(() => expect(screen.getByRole('region')).toHaveStyle({ left: '764px' }))

    await rerender({ collapsed: true })
    await vi.waitFor(() => expect(screen.getByRole('button', { name: /Show the overlay/ })).toHaveStyle({ left: '900px' }))
    await rerender({ collapsed: false })

    await vi.waitFor(() => expect(screen.getByRole('region')).toHaveStyle({ left: '764px' }))
  })

  test('grown taller by more pinned rows, comes in as far as it needs to stay whole inside the page', async () => {
    const sizeChanges: (() => void)[] = []
    vi.stubGlobal('ResizeObserver', class {
      constructor(changed: () => void) {
        sizeChanges.push(changed)
      }

      observe() {}

      disconnect() {}
    })
    renderPanel({ position: { corner: 'top left', offset: { x: 12, y: 300 } } })
    const panel = screen.getByRole('region')
    await new Promise((resolve) => setTimeout(resolve))

    layOut(panel, { left: 12, top: 300, width: 260, height: 600 })
    expect(panel).toHaveStyle({ top: '300px' })
    sizeChanges.forEach((changed) => changed())

    await vi.waitFor(() => expect(panel).toHaveStyle({ top: '168px', left: '12px' }))
  })

  test('leaves no listener of a drag on the window after a drop, Escape, a cancelled pointer, the window losing focus or the overlay going away', async () => {
    const listening = new Set<unknown>()
    const add = window.addEventListener.bind(window)
    const remove = window.removeEventListener.bind(window)
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      listening.add(listener)
      add(type, listener, options)
    })
    vi.spyOn(window, 'removeEventListener').mockImplementation((type, listener, options) => {
      listening.delete(listener)
      remove(type, listener, options)
    })
    const { unmount } = renderPanel()
    layOut(screen.getByRole('region'), { left: 752, top: 556, width: 260, height: 200 })
    await userEvent.click(screen.getByRole('button', { name: 'Move the overlay' }))
    const before = listening.size
    const endings = [
      () => fireEvent.pointerUp(window, { pointerId: 7, clientX: 800, clientY: 600 }),
      () => fireEvent.keyDown(window, { key: 'Escape' }),
      () => fireEvent.pointerCancel(window, { pointerId: 7 }),
      () => fireEvent.blur(window)
    ]

    for (const end of endings) {
      await fireEvent.pointerDown(screen.getByText('Pinned'), { pointerId: 7, clientX: 900, clientY: 600 })
      expect(listening.size).toBeGreaterThan(before)
      await end()
      expect(listening.size).toBe(before)
    }
    await fireEvent.pointerDown(screen.getByText('Pinned'), { pointerId: 7, clientX: 900, clientY: 600 })
    unmount()

    expect(listening.size).toBe(0)
  })

  test('sits at the position it is given, expanded and collapsed', () => {
    renderPanel({ position: { corner: 'top left', offset: { x: 300, y: 40 } } })
    renderPanel({ position: bottomRight, collapsed: true })

    expect(screen.getByRole('region')).toHaveStyle({ top: '40px', left: '300px' })
    expect(screen.getByRole('button', { name: /Show the overlay/ })).toHaveStyle({ bottom: '12px', right: '12px' })
  })
})
