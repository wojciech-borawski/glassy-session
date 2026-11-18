import { fireEvent, render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { h } from 'vue'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import type { Corner } from './model/overlay-settings'
import OverlayPanel from './overlay-panel.vue'

function renderPanel(props: { corner?: Corner, collapsed?: boolean, count?: number } = {}) {
  return render(OverlayPanel, {
    props: { corner: 'bottom right', collapsed: false, count: 1, ...props },
    slots: { default: () => h('li', 'Tea 3:00') },
    global: { plugins: [createAppI18n()] }
  })
}

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

  test('dragged by its handle and dropped in another quarter of the page, asks to move to that corner', async () => {
    const { emitted } = renderPanel({ corner: 'bottom right' })
    const handle = screen.getByRole('button', { name: 'Move the overlay' })

    await fireEvent.pointerDown(handle, { pointerId: 1, clientX: 1000, clientY: 740 })
    await fireEvent.pointerMove(window, { pointerId: 1, clientX: 400, clientY: 300 })
    await fireEvent.pointerUp(window, { pointerId: 1, clientX: 100, clientY: 100 })

    expect(window.innerWidth).toBeGreaterThan(200)
    expect(emitted('move')).toEqual([['top left']])
  })

  test('a drag ended by Escape, a cancelled pointer or the window losing focus moves nothing', async () => {
    const { emitted } = renderPanel({ corner: 'bottom right' })
    const handle = screen.getByRole('button', { name: 'Move the overlay' })
    const endings = [
      () => fireEvent.keyDown(window, { key: 'Escape' }),
      () => fireEvent.pointerCancel(window, { pointerId: 1 }),
      () => fireEvent.blur(window)
    ]

    for (const end of endings) {
      await fireEvent.pointerDown(handle, { pointerId: 1, clientX: 1000, clientY: 740 })
      await fireEvent.pointerMove(window, { pointerId: 1, clientX: 100, clientY: 100 })
      await end()
      await fireEvent.pointerUp(window, { pointerId: 1, clientX: 100, clientY: 100 })
    }

    expect(emitted('move')).toBeUndefined()
    expect(screen.getByRole('region')).not.toHaveStyle({ translate: '-900px -640px' })
  })

  test('asks to move to the neighbouring corner when an arrow key is pressed on its handle', async () => {
    const { emitted } = renderPanel({ corner: 'bottom right' })

    screen.getByRole('button', { name: 'Move the overlay' }).focus()
    await userEvent.keyboard('{ArrowUp}{ArrowLeft}{ArrowRight}')

    expect(emitted('move')).toEqual([['top right'], ['bottom left']])
  })

  test('sits in the corner it is given, expanded and collapsed', () => {
    renderPanel({ corner: 'top left' })
    renderPanel({ corner: 'bottom right', collapsed: true })

    expect(screen.getByRole('region')).toHaveStyle({ top: '12px', left: '12px' })
    expect(screen.getByRole('button', { name: /Show the overlay/ })).toHaveStyle({ bottom: '12px', right: '12px' })
  })
})
