import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { createTimer, start } from '../timer/model/timer'
import FocusSessionDialog from './focus-session-dialog.vue'
import { createFocusSession, pin, type FocusSession } from './model/focus-session'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const NINE = Date.UTC(2026, 10, 17, 9)

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'blue' } })
const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 3 * MINUTE, appearance: { colour: 'teal' } })
const answerEmail = createTimer({ id: 'answer-email', name: 'Answer email', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' } })

const morningSettings = { name: 'Morning', taskIds: ['write-report'], stepLength: 30 * MINUTE, breakLength: 10 * MINUTE, order: 'one after another' } as const
const morning = createFocusSession({ id: 'morning', ...morningSettings }, [{ taskId: 'write-report', remainingTime: 50 * MINUTE }])

function renderDialog(session: FocusSession | null = null, open = true) {
  return render(FocusSessionDialog, {
    props: { open, session, tasks: [writeReport, tea, answerEmail], now: NINE },
    global: { plugins: [createAppI18n()] }
  })
}

async function setNumber(field: HTMLElement, value: number) {
  await userEvent.clear(field)
  await userEvent.type(field, String(value))
}

describe('the focus session dialog', () => {
  test('keeps Delete, Cancel and Save in the footer that stays in view while the fields scroll, and Save there still saves', async () => {
    const { emitted } = renderDialog(morning)
    const dialog = screen.getByRole('dialog', { name: 'Edit focus session' })

    for (const name of ['Delete Morning', 'Cancel', 'Save']) {
      expect(within(dialog).getByRole('button', { name }).closest('footer')).not.toBeNull()
    }
    expect(within(dialog).getByRole('textbox', { name: 'Name' }).closest('footer')).toBeNull()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toHaveLength(1)
  })

  test('builds a new focus session from the chosen tasks, step length, break length and order, and asks to save it', async () => {
    const { emitted } = renderDialog()
    const dialog = screen.getByRole('dialog', { name: 'New focus session' })

    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), ' Morning ')
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Answer email' }))
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Write report' }))
    await setNumber(within(dialog).getByRole('spinbutton', { name: 'Step length in minutes' }), 20)
    await setNumber(within(dialog).getByRole('spinbutton', { name: 'Break length in minutes' }), 0)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Alternating' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toEqual([[{
      name: 'Morning',
      taskIds: ['answer-email', 'write-report'],
      stepLength: 20 * MINUTE,
      breakLength: 0,
      order: 'alternating'
    }]])
  })

  test('offers every stored task with what it has left, and no timer that is not a task', () => {
    renderDialog()
    const tasks = within(screen.getByRole('group', { name: 'Tasks' }))

    expect(tasks.getAllByRole('checkbox')).toHaveLength(2)
    expect(tasks.getByRole('checkbox', { name: 'Write report' })).toHaveAccessibleDescription('50m left')
    expect(tasks.getByRole('checkbox', { name: 'Answer email' })).toHaveAccessibleDescription('30m left')
  })

  test('fills in what a stored focus session has when editing it, and asks to save what is changed', async () => {
    const { emitted } = renderDialog(morning)
    const dialog = screen.getByRole('dialog', { name: 'Edit focus session' })

    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toHaveValue('Morning')
    expect(within(dialog).getByRole('checkbox', { name: 'Write report' })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'Answer email' })).not.toBeChecked()
    expect(within(dialog).getByRole('spinbutton', { name: 'Step length in minutes' })).toHaveValue(30)
    expect(within(dialog).getByRole('spinbutton', { name: 'Break length in minutes' })).toHaveValue(10)
    expect(within(dialog).getByRole('button', { name: 'One after another' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(dialog).getByRole('button', { name: 'Alternating' })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Answer email' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toEqual([[{ ...morningSettings, taskIds: ['write-report', 'answer-email'] }]])
  })

  test('pins a new focus session when Pin to the overlay is switched on', async () => {
    const { emitted } = renderDialog()
    const dialog = screen.getByRole('dialog', { name: 'New focus session' })
    const pinSwitch = within(dialog).getByRole('switch', { name: 'Pin to the overlay' })

    expect(pinSwitch).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(pinSwitch)
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Morning')
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Write report' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toEqual([[{ name: 'Morning', taskIds: ['write-report'], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another', pinned: true }]])
  })

  test('edits a pinned focus session with its pin switched on, and unpins it when the pin is switched off', async () => {
    const { emitted } = renderDialog(pin(morning))
    const pinSwitch = within(screen.getByRole('dialog', { name: 'Edit focus session' })).getByRole('switch', { name: 'Pin to the overlay' })

    expect(pinSwitch).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(pinSwitch)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toEqual([[{ ...morningSettings, pinned: false }]])
  })

  test('asks for a name and at least one task before saving, moving focus to the first thing missing', async () => {
    const { emitted } = renderDialog()
    const dialog = screen.getByRole('dialog', { name: 'New focus session' })
    const name = within(dialog).getByRole('textbox', { name: 'Name' })

    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(name).toHaveAccessibleDescription('Give it a name.')
    expect(within(dialog).getByRole('group', { name: 'Tasks' })).toHaveAccessibleDescription('Choose at least one task.')
    expect(name).toHaveFocus()
    await userEvent.type(name, 'Morning{Enter}')

    expect(within(dialog).getByRole('checkbox', { name: 'Write report' })).toHaveFocus()
    expect(emitted('save')).toBeUndefined()
  })

  test('offers to delete the focus session being edited, naming it, and nothing to delete when adding one', async () => {
    const { emitted } = renderDialog(morning)

    await userEvent.click(screen.getByRole('button', { name: 'Delete Morning' }))

    expect(emitted('remove')).toHaveLength(1)
    renderDialog()
    expect(screen.getAllByRole('button', { name: /Delete/ })).toHaveLength(1)
  })

  test('asks to close when Cancel is chosen or Escape is pressed, without saving', async () => {
    const { emitted } = renderDialog(morning)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await userEvent.keyboard('{Escape}')

    expect(emitted('close')).toHaveLength(2)
    expect(emitted('save')).toBeUndefined()
  })

  test('starts again from the focus session it is given each time it opens, with nothing missing yet', async () => {
    const { rerender } = renderDialog(null)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await rerender({ open: false })

    await rerender({ open: true, session: morning })

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Morning')
    expect(screen.queryByText('Choose at least one task.')).not.toBeInTheDocument()
    await rerender({ open: false })
    await rerender({ open: true, session: null })
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('')
    expect(screen.getByRole('checkbox', { name: 'Write report' })).not.toBeChecked()
    expect(screen.queryByText('Give it a name.')).not.toBeInTheDocument()
  })

  test('says a task with no time left is done', () => {
    render(FocusSessionDialog, {
      props: { open: true, session: null, tasks: [start(writeReport, NINE - HOUR).timer], now: NINE },
      global: { plugins: [createAppI18n()] }
    })

    expect(screen.getByRole('checkbox', { name: 'Write report' })).toHaveAccessibleDescription('Done')
  })

  test('says that a break length of zero means no breaks', () => {
    renderDialog()

    expect(screen.getByText('A break length of 0 means no breaks.')).toBeInTheDocument()
  })
})

describe('the background sound of a focus session in its dialog', () => {
  test('the fields given for it sit in the form, after the other fields and before the buttons', () => {
    render(FocusSessionDialog, {
      props: { open: true, session: null, tasks: [writeReport, tea, answerEmail], now: NINE },
      slots: { sound: '<p>Sound fields</p>' },
      global: { plugins: [createAppI18n()] }
    })

    const sound = screen.getByText('Sound fields')
    expect(sound.closest('form')).toBe(screen.getByRole('button', { name: 'Save' }).closest('form'))
    expect(screen.getByRole('group', { name: 'Order' }).compareDocumentPosition(sound)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(sound.compareDocumentPosition(screen.getByRole('button', { name: 'Save' }))).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })
})
