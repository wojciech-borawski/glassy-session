import { fireEvent, render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import NDialog from './index.vue'

function renderDialog(open: boolean) {
  return render(NDialog, {
    props: { open, title: 'New task' },
    slots: { default: '<input aria-label="Name"><button>Save</button>' },
    global: { plugins: [createAppI18n()] }
  })
}

describe('NDialog', () => {
  test('shows a modal dialog named by its title only while open', async () => {
    const { rerender } = renderDialog(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await rerender({ open: true })

    expect(screen.getByRole('dialog', { name: 'New task' })).toHaveAttribute('aria-modal', 'true')
  })

  test('asks to close when Escape is pressed', async () => {
    const { emitted } = renderDialog(true)
    screen.getByRole('textbox', { name: 'Name' }).focus()

    await userEvent.keyboard('{Escape}')

    expect(emitted('close')).toHaveLength(1)
  })

  test('asks to close when its close button is pressed', async () => {
    const { emitted } = renderDialog(true)

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(emitted('close')).toHaveLength(1)
  })

  test('asks to close on a click outside it, and not on a click inside it', async () => {
    const { emitted } = renderDialog(true)
    const dialog = screen.getByRole('dialog', { name: 'New task' })

    await userEvent.click(dialog)
    expect(emitted('close')).toBeUndefined()
    await userEvent.click(dialog.parentElement as HTMLElement)

    expect(emitted('close')).toHaveLength(1)
  })

  test('stays open when a press starts inside it and ends outside it', async () => {
    const { emitted } = renderDialog(true)
    const field = screen.getByRole('textbox', { name: 'Name' })
    const outside = screen.getByRole('dialog', { name: 'New task' }).parentElement as HTMLElement

    await fireEvent.pointerDown(field)
    await fireEvent.pointerUp(outside)
    await fireEvent.click(outside)

    expect(emitted('close')).toBeUndefined()
  })

  test('moves focus to the first control in its content when it opens', async () => {
    const { rerender } = renderDialog(false)

    await rerender({ open: true })
    await nextTick()

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus()
  })

  test('moves focus to its close button when its content has no control', async () => {
    render(NDialog, {
      props: { open: true, title: 'About' },
      slots: { default: 'Nothing to fill in.' },
      global: { plugins: [createAppI18n()] }
    })
    await nextTick()

    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  })

  test('keeps focus inside while Tab and Shift+Tab move through it', async () => {
    render({
      components: { NDialog },
      template: `
        <button>Before</button>
        <NDialog open title="New task"><input aria-label="Name"><button>Save</button></NDialog>
        <button>After</button>
      `
    }, { global: { plugins: [createAppI18n()] } })
    await nextTick()
    screen.getByRole('button', { name: 'Save' }).focus()

    await userEvent.tab()
    const afterTab = document.activeElement
    await userEvent.tab({ shift: true })

    expect(afterTab).toBe(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus()
  })

  test('keeps its name while its title and its actions are no banner or content info landmarks inside it', async () => {
    render({
      components: { NDialog },
      template: `
        <NDialog open title="New task">
          <input aria-label="Name">
          <template #actions><button>Save</button></template>
        </NDialog>
      `
    }, { global: { plugins: [createAppI18n()] } })
    await nextTick()

    const dialog = screen.getByRole('dialog', { name: 'New task' })
    expect(within(dialog).queryByRole('banner')).toBeNull()
    expect(within(dialog).queryByRole('contentinfo')).toBeNull()
  })

  test('shows its actions in a footer after the body that scrolls, so its title and actions stay in view, and Tab reaches them', async () => {
    render({
      components: { NDialog },
      template: `
        <NDialog open title="New task">
          <input aria-label="Name">
          <template #actions><button>Save</button></template>
        </NDialog>
      `
    }, { global: { plugins: [createAppI18n()] } })
    await nextTick()
    const name = screen.getByRole('textbox', { name: 'Name' })
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save.closest('footer')).not.toBeNull()
    expect(name.closest('footer')).toBeNull()
    expect(name.parentElement?.contains(save)).toBe(false)
    expect(name).toHaveFocus()

    await userEvent.tab()
    const afterName = document.activeElement
    await userEvent.tab()

    expect(afterName).toBe(save)
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  })

  test('as a form, holds its body and its actions in one form, and asks to submit on Enter in a field or on its submit action', async () => {
    const { emitted } = render({
      components: { NDialog },
      emits: ['submit'],
      template: `
        <NDialog open form title="New task" @submit="$emit('submit')">
          <input aria-label="Name">
          <template #actions><button type="submit">Save</button></template>
        </NDialog>
      `
    }, { global: { plugins: [createAppI18n()] } })

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Tea{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(emitted('submit')).toHaveLength(2)
  })

  test('gives focus back to the control that opened it when it closes', async () => {
    render({
      components: { NDialog },
      setup: () => ({ open: ref(false) }),
      template: `
        <button @click="open = true">New</button>
        <NDialog :open="open" title="New task" @close="open = false"><input aria-label="Name"></NDialog>
      `
    }, { global: { plugins: [createAppI18n()] } })

    await userEvent.click(screen.getByRole('button', { name: 'New' }))
    await nextTick()
    await userEvent.keyboard('{Escape}')
    await nextTick()

    expect(screen.getByRole('button', { name: 'New' })).toHaveFocus()
  })

  test('gives focus back to its opener inside a shadow root as well', async () => {
    const host = document.body.appendChild(document.createElement('div'))
    const container = host.attachShadow({ mode: 'open' }).appendChild(document.createElement('div'))
    render({
      components: { NDialog },
      setup: () => ({ open: ref(false) }),
      template: `
        <button @click="open = true">New</button>
        <NDialog :open="open" title="New task" @close="open = false"><input aria-label="Name"></NDialog>
      `
    }, { container, global: { plugins: [createAppI18n()] } })
    const opener = container.querySelector('button') as HTMLButtonElement

    await userEvent.click(opener)
    await nextTick()
    await userEvent.keyboard('{Escape}')
    await nextTick()

    expect(host.shadowRoot?.activeElement).toBe(opener)
  })

  test('gives focus back to its opener when it is removed while open', async () => {
    const shown = ref(false)
    render({
      components: { NDialog },
      setup: () => ({ shown }),
      template: `
        <button @click="shown = true">New</button>
        <NDialog v-if="shown" open title="New task"><input aria-label="Name"></NDialog>
      `
    }, { global: { plugins: [createAppI18n()] } })

    await userEvent.click(screen.getByRole('button', { name: 'New' }))
    await nextTick()
    shown.value = false
    await nextTick()

    expect(screen.getByRole('button', { name: 'New' })).toHaveFocus()
  })
})
