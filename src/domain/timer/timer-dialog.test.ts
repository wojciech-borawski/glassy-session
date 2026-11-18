import { render, screen, waitFor, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createMemorySounds } from '@/infrastructure/memory/sounds'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { soundsPlugin } from '../sound/sounds'
import { createTimer, pin } from './model/timer'
import TimerDialog from './timer-dialog.vue'

const MINUTE = 60_000

const bell = { kind: 'built-in', name: 'bell' }

const tea = createTimer({ id: 'tea', name: 'Tea', description: 'Green tea', kind: 'timer', plannedTime: 95 * MINUTE, appearance: { colour: 'gold' } })

const reading = createTimer({ id: 'read', name: 'Read', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' }, repeatDays: [1, 3] })

function renderDialog(props: Record<string, unknown> = {}, sounds = createMemorySounds()) {
  return render(TimerDialog, { props: { open: true, timer: null, ...props }, global: { plugins: [createAppI18n(), soundsPlugin(sounds)] } })
}

const gong = () => new File([new Uint8Array([1, 2, 3])], 'gong.mp3', { type: 'audio/mpeg' })

describe('the timer dialog', () => {
  test('keeps Delete, Cancel and Save in the footer that stays in view while the fields scroll, and Save there still saves', async () => {
    const { emitted } = renderDialog({ timer: tea })
    const dialog = screen.getByRole('dialog', { name: 'Edit timer' })

    for (const name of ['Delete Tea', 'Cancel', 'Save']) {
      expect(within(dialog).getByRole('button', { name }).closest('footer')).not.toBeNull()
    }
    expect(within(dialog).getByRole('textbox', { name: 'Name' }).closest('footer')).toBeNull()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toHaveLength(1)
  })

  test('adds a task from what is filled in, starting from 25 minutes', async () => {
    const { emitted } = renderDialog()
    const dialog = screen.getByRole('dialog', { name: 'New task' })

    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Write report')
    await userEvent.clear(within(dialog).getByRole('spinbutton', { name: 'Hours' }))
    await userEvent.type(within(dialog).getByRole('spinbutton', { name: 'Hours' }), '1')
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Green' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toEqual([[{ kind: 'task', details: { name: 'Write report', plannedTime: 85 * MINUTE, appearance: { colour: 'green' }, ringSound: bell } }]])
  })

  test('adds a timer instead when Timer is chosen, and says which one is chosen', async () => {
    const { emitted } = renderDialog()
    const taskChoice = screen.getByRole('button', { name: 'Task' })

    await userEvent.click(screen.getByRole('button', { name: 'Timer' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Tea{Enter}')

    expect(screen.getByRole('dialog', { name: 'New timer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Timer' })).toHaveAttribute('aria-pressed', 'true')
    expect(taskChoice).toHaveAttribute('aria-pressed', 'false')
    expect(emitted('save')).toEqual([[{ kind: 'timer', details: { name: 'Tea', plannedTime: 25 * MINUTE, appearance: { colour: 'blue' }, ringSound: bell } }]])
  })

  test('saves the name and the description without the spaces around them', async () => {
    const { emitted } = renderDialog()

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), '  Write report ')
    await userEvent.type(screen.getByRole('textbox', { name: 'Description' }), ' Chapters 3 to 5  ')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toEqual([[{ kind: 'task', details: { name: 'Write report', description: 'Chapters 3 to 5', plannedTime: 25 * MINUTE, appearance: { colour: 'blue' }, ringSound: bell } }]])
  })

  test('does not save without a name, says why next to the name and moves focus there', async () => {
    const { emitted } = renderDialog()

    await userEvent.type(screen.getByRole('textbox', { name: 'Description' }), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    const nameField = screen.getByRole('textbox', { name: 'Name' })
    expect(emitted('save')).toBeUndefined()
    expect(nameField).toHaveAccessibleDescription('Give it a name.')
    expect(nameField).toHaveAttribute('aria-invalid', 'true')
    expect(nameField).toHaveFocus()
  })

  test('does not save a planned time of zero, says why under the planned time and moves focus to the hours', async () => {
    const { emitted } = renderDialog()

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Write report')
    await userEvent.clear(screen.getByRole('spinbutton', { name: 'Minutes' }))
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Minutes' }), '0')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toBeUndefined()
    expect(screen.getByRole('group', { name: 'Planned time' })).toHaveAccessibleDescription('The planned time must be more than zero.')
    expect(screen.getByRole('spinbutton', { name: 'Hours' })).toHaveFocus()
  })

  test('edits a stored timer from what it has now, without offering to change its kind', async () => {
    const { emitted } = renderDialog({ timer: tea })
    const dialog = screen.getByRole('dialog', { name: 'Edit timer' })

    expect(within(dialog).getByRole('textbox', { name: 'Description' })).toHaveValue('Green tea')
    expect(within(dialog).getByRole('spinbutton', { name: 'Hours' })).toHaveValue(1)
    expect(within(dialog).getByRole('spinbutton', { name: 'Minutes' })).toHaveValue(35)
    expect(within(dialog).getByRole('radio', { name: 'Gold' })).toBeChecked()
    expect(within(dialog).queryByRole('group', { name: 'Kind' })).not.toBeInTheDocument()
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), ' with lemon{Enter}')

    expect(emitted('save')).toEqual([[{ kind: 'timer', details: { name: 'Tea with lemon', description: 'Green tea', plannedTime: 95 * MINUTE, appearance: { colour: 'gold' }, ringSound: bell } }]])
  })

  test('rings with the bell unless another ring sound is chosen, and saves the one chosen', async () => {
    const { emitted } = renderDialog()
    const ringSound = screen.getByRole('combobox', { name: 'Ring sound' })
    expect(ringSound).toHaveDisplayValue('Bell')

    await userEvent.selectOptions(ringSound, 'Digital')
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Tea{Enter}')

    expect(emitted('save')).toEqual([[{ kind: 'task', details: { name: 'Tea', plannedTime: 25 * MINUTE, appearance: { colour: 'blue' }, ringSound: { kind: 'built-in', name: 'digital' } } }]])
  })

  test('an audio file picked for the ring sound is kept only once the dialog is saved, and the timer rings with the kept file', async () => {
    const sounds = createMemorySounds()
    const { emitted } = renderDialog({}, sounds)

    await userEvent.upload(screen.getByLabelText('Own audio file for Ring sound'), gong())
    expect(screen.getByRole('combobox', { name: 'Ring sound' })).toHaveDisplayValue('gong.mp3')
    expect(await sounds.audioFiles.list()).toEqual([])
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Tea{Enter}')

    await waitFor(() => expect(emitted('save')).toHaveLength(1))
    const kept = await sounds.audioFiles.list()
    expect(kept.map(({ name }) => name)).toEqual(['gong.mp3'])
    expect(emitted('save')).toEqual([[{ kind: 'task', details: expect.objectContaining({ ringSound: { kind: 'audio file', fileId: kept[0]?.id } }) }]])
  })

  test('an audio file picked in a dialog closed without saving is never kept, and is no longer offered when it opens again', async () => {
    const sounds = createMemorySounds()
    const { rerender } = renderDialog({}, sounds)
    await userEvent.upload(screen.getByLabelText('Own audio file for Ring sound'), gong())

    await rerender({ open: false, timer: null })
    await rerender({ open: true, timer: null })

    expect(await sounds.audioFiles.list()).toEqual([])
    expect(screen.queryByRole('option', { name: 'gong.mp3' })).toBeNull()
  })

  test('edits a stored timer from the ring sound it has now', () => {
    renderDialog({ timer: { ...tea, ringSound: { kind: 'built-in', name: 'marimba' } } })

    expect(screen.getByRole('combobox', { name: 'Ring sound' })).toHaveDisplayValue('Marimba')
  })

  test('pins a new timer when Pin to the overlay is switched on', async () => {
    const { emitted } = renderDialog()
    const dialog = screen.getByRole('dialog', { name: 'New task' })
    const pinSwitch = within(dialog).getByRole('switch', { name: 'Pin to the overlay' })

    expect(pinSwitch).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(pinSwitch)
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Write report{Enter}')

    expect(emitted('save')).toEqual([[{ kind: 'task', details: { name: 'Write report', plannedTime: 25 * MINUTE, appearance: { colour: 'blue' }, ringSound: bell, pinned: true } }]])
  })

  test('edits a pinned timer with its pin switched on, and unpins it when the pin is switched off', async () => {
    const { emitted } = renderDialog({ timer: pin(tea).timer })
    const pinSwitch = within(screen.getByRole('dialog', { name: 'Edit timer' })).getByRole('switch', { name: 'Pin to the overlay' })

    expect(pinSwitch).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(pinSwitch)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toEqual([[{ kind: 'timer', details: { name: 'Tea', description: 'Green tea', plannedTime: 95 * MINUTE, appearance: { colour: 'gold' }, ringSound: bell, pinned: false } }]])
  })

  test('starts again from the timer it is opened for each time it opens, leaving no error from before', async () => {
    const { rerender } = renderDialog({ open: false })

    await rerender({ open: true, timer: null })
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await rerender({ open: false, timer: null })
    await rerender({ open: true, timer: tea })

    const nameField = screen.getByRole('textbox', { name: 'Name' })
    expect(nameField).toHaveValue('Tea')
    expect(nameField).not.toHaveAttribute('aria-invalid')
    await rerender({ open: false, timer: null })
    await rerender({ open: true, timer: null })
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('')
    expect(screen.getByRole('spinbutton', { name: 'Minutes' })).toHaveValue(25)
  })

  test('offers to delete a stored timer, and asks for it to be removed', async () => {
    const { emitted } = renderDialog({ timer: tea })

    await userEvent.click(screen.getByRole('button', { name: 'Delete Tea' }))

    expect(emitted('remove')).toHaveLength(1)
    expect(emitted('save')).toBeUndefined()
  })

  test('asks to close without saving when Cancel is chosen', async () => {
    const { emitted } = renderDialog()

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Write report')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(emitted('close')).toHaveLength(1)
    expect(emitted('save')).toBeUndefined()
  })

  test('asks to close when Escape is pressed', async () => {
    const { emitted } = renderDialog()

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Write{Escape}')

    expect(emitted('close')).toHaveLength(1)
  })

  test('adds a repeating task with the repeat days chosen', async () => {
    const { emitted } = renderDialog()

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Read')
    await userEvent.click(within(screen.getByRole('group', { name: 'Repeat' })).getByRole('button', { name: 'Repeating' }))
    const repeatDays = screen.getByRole('group', { name: 'Repeat days' })
    await userEvent.click(within(repeatDays).getByRole('button', { name: 'Wednesday' }))
    await userEvent.click(within(repeatDays).getByRole('button', { name: 'Monday' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toEqual([[{ kind: 'task', details: { name: 'Read', plannedTime: 25 * MINUTE, appearance: { colour: 'blue' }, repeatDays: [1, 3], ringSound: bell } }]])
  })

  test('does not save a repeating task without a repeat day, says why next to the repeat days and moves focus to the first day', async () => {
    const { emitted } = renderDialog()

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Read')
    await userEvent.click(screen.getByRole('button', { name: 'Repeating' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toBeUndefined()
    const repeatDays = screen.getByRole('group', { name: 'Repeat days' })
    expect(repeatDays).toHaveAccessibleDescription('Choose at least one repeat day.')
    expect(within(repeatDays).getByRole('button', { name: 'Monday' })).toHaveFocus()
  })

  test('edits a repeating task from its repeat days, and saves it as one-time when One-time is chosen', async () => {
    const { emitted } = renderDialog({ timer: reading })

    expect(screen.getByRole('button', { name: 'Repeating' })).toHaveAttribute('aria-pressed', 'true')
    const repeatDays = screen.getByRole('group', { name: 'Repeat days' })
    expect(within(repeatDays).getByRole('button', { name: 'Monday' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(repeatDays).getByRole('button', { name: 'Tuesday' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(repeatDays).getByRole('button', { name: 'Wednesday' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'One-time' }))

    expect(screen.queryByRole('group', { name: 'Repeat days' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(emitted('save')).toEqual([[{ kind: 'task', details: { name: 'Read', plannedTime: 30 * MINUTE, appearance: { colour: 'green' }, ringSound: bell } }]])
  })

  test('offers no repeat for a timer, and saves a timer without repeat days even after Repeating was chosen for it as a task', async () => {
    const { emitted } = renderDialog()

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Tea')
    await userEvent.click(screen.getByRole('button', { name: 'Repeating' }))
    await userEvent.click(screen.getByRole('button', { name: 'Monday' }))
    await userEvent.click(screen.getByRole('button', { name: 'Timer' }))

    expect(screen.queryByRole('group', { name: 'Repeat' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(emitted('save')).toEqual([[{ kind: 'timer', details: { name: 'Tea', plannedTime: 25 * MINUTE, appearance: { colour: 'blue' }, ringSound: bell } }]])
  })

  test('says what the chosen kind means', async () => {
    renderDialog()
    const hint = screen.getByText('A task is tracked and can go into a focus session.')

    await userEvent.click(screen.getByRole('button', { name: 'Timer' }))

    expect(hint).toHaveTextContent('A plain timer only rings. Nothing is tracked.')
  })
})

describe('the background sound of a timer in its dialog', () => {
  test('the fields given for it sit in the form, after the other fields and before the buttons', () => {
    render(TimerDialog, {
      props: { open: true, timer: null },
      slots: { sound: '<p>Sound fields</p>' },
      global: { plugins: [createAppI18n(), soundsPlugin(createMemorySounds())] }
    })

    const sound = screen.getByText('Sound fields')
    expect(sound.closest('form')).toBe(screen.getByRole('button', { name: 'Save' }).closest('form'))
    expect(screen.getByRole('textbox', { name: 'Description' }).compareDocumentPosition(sound)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(sound.compareDocumentPosition(screen.getByRole('button', { name: 'Save' }))).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  test('while editing a task offers its statistics', async () => {
    const { emitted } = renderDialog({ timer: reading })

    await userEvent.click(within(screen.getByRole('dialog', { name: 'Edit task' })).getByRole('button', { name: 'Statistics for Read' }))

    expect(emitted('statistics')).toHaveLength(1)
  })

  test('offers no statistics for a new task or a timer, since only a saved task has tracked time', () => {
    renderDialog({ timer: tea })
    renderDialog()

    expect(screen.queryByRole('button', { name: /Statistics/ })).not.toBeInTheDocument()
  })
})
