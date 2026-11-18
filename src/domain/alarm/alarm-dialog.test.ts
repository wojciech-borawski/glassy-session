import { render, screen, waitFor, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createMemorySounds } from '@/infrastructure/memory/sounds'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { soundsPlugin } from '../sound/sounds'
import AlarmDialog from './alarm-dialog.vue'
import { createAlarm } from './model/alarm'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const bell = { kind: 'built-in', name: 'bell' }

/** The moment the local clock shows the date and time, written as YYYY-MM-DDTHH:MM. */
const at = (localTime: string) => new Date(localTime).getTime()

const dentist = createAlarm({ id: 'dentist', name: 'Dentist', time: 15 * HOUR + 30 * MINUTE, days: { kind: 'one-time', date: '2026-11-20' }, sendsNotification: false })

function renderDialog(props: Record<string, unknown> = {}, sounds = createMemorySounds()) {
  return render(AlarmDialog, { props: { open: true, alarm: null, today: '2026-11-17', now: at('2026-11-17T07:00'), ...props }, global: { plugins: [createAppI18n(), soundsPlugin(sounds)] } })
}

describe('the alarm dialog', () => {
  test('an audio file picked for the ring sound is kept only once the dialog is saved, and the alarm rings with the kept file', async () => {
    const sounds = createMemorySounds()
    const { emitted } = renderDialog({}, sounds)

    await userEvent.upload(screen.getByLabelText('Own audio file for Ring sound'), new File([new Uint8Array([1])], 'gong.mp3', { type: 'audio/mpeg' }))
    expect(await sounds.audioFiles.list()).toEqual([])
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Wake up{Enter}')

    await waitFor(() => expect(emitted('save')).toHaveLength(1))
    const kept = await sounds.audioFiles.list()
    expect(emitted('save')).toEqual([[expect.objectContaining({ ringSound: { kind: 'audio file', fileId: kept[0]?.id } })]])
  })

  test('keeps Delete, Cancel and Save in the footer that stays in view while the fields scroll, and Save there still saves', async () => {
    const { emitted } = renderDialog({ alarm: dentist })
    const dialog = screen.getByRole('dialog', { name: 'Edit alarm' })

    for (const name of ['Delete Dentist', 'Cancel', 'Save']) {
      expect(within(dialog).getByRole('button', { name }).closest('footer')).not.toBeNull()
    }
    expect(within(dialog).getByRole('textbox', { name: 'Name' }).closest('footer')).toBeNull()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toHaveLength(1)
  })

  test('adds an alarm from what is filled in, starting from 08:00 on weekdays with a system notification', async () => {
    const { emitted } = renderDialog()
    const dialog = screen.getByRole('dialog', { name: 'New alarm' })

    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Wake up')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toEqual([[{ name: 'Wake up', time: 8 * HOUR, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: true, ringSound: bell }]])
  })

  test('saves the time typed in and the repeat days chosen, without the spaces around the name', async () => {
    const { emitted } = renderDialog()

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), '  Gym ')
    const time = screen.getByLabelText('Time')
    await userEvent.clear(time)
    await userEvent.type(time, '18:45')
    const days = screen.getByRole('group', { name: 'Repeat days' })
    await userEvent.click(within(days).getByRole('button', { name: 'Monday' }))
    await userEvent.click(within(days).getByRole('button', { name: 'Saturday' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toEqual([[{ name: 'Gym', time: 18 * HOUR + 45 * MINUTE, days: { kind: 'repeating', repeatDays: [2, 3, 4, 5, 6] }, sendsNotification: true, ringSound: bell }]])
  })

  test('adds a one-time alarm on the date chosen, starting from today, and says which choice is made', async () => {
    const { emitted } = renderDialog()
    const repeats = screen.getByRole('button', { name: 'Repeats' })

    await userEvent.click(screen.getByRole('button', { name: 'Once' }))
    const date = screen.getByLabelText('Date')
    expect(date).toHaveValue('2026-11-17')
    expect(screen.queryByRole('group', { name: 'Repeat days' })).not.toBeInTheDocument()
    await userEvent.clear(date)
    await userEvent.type(date, '2026-11-20')
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Dentist{Enter}')

    expect(screen.getByRole('button', { name: 'Once' })).toHaveAttribute('aria-pressed', 'true')
    expect(repeats).toHaveAttribute('aria-pressed', 'false')
    expect(emitted('save')).toEqual([[{ name: 'Dentist', time: 8 * HOUR, days: { kind: 'one-time', date: '2026-11-20' }, sendsNotification: true, ringSound: bell }]])
  })

  test('saves an alarm that sends no system notification when the switch for it is turned off', async () => {
    const { emitted } = renderDialog()
    const notification = screen.getByRole('switch', { name: 'System notification' })

    expect(notification).toHaveAccessibleDescription('Also show a message from the operating system when it rings.')
    await userEvent.click(notification)
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Lunch{Enter}')

    expect(notification).toHaveAttribute('aria-checked', 'false')
    expect(emitted('save')).toEqual([[{ name: 'Lunch', time: 8 * HOUR, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: false, ringSound: bell }]])
  })

  test('does not save without a name, says why next to the name and moves focus there', async () => {
    const { emitted } = renderDialog()

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    const nameField = screen.getByRole('textbox', { name: 'Name' })
    expect(emitted('save')).toBeUndefined()
    expect(nameField).toHaveAccessibleDescription('Give it a name.')
    expect(nameField).toHaveAttribute('aria-invalid', 'true')
    expect(nameField).toHaveFocus()
  })

  test('does not save a repeating alarm without repeat days, says why next to the days and moves focus to the first day', async () => {
    const { emitted } = renderDialog()
    const days = screen.getByRole('group', { name: 'Repeat days' })
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      await userEvent.click(within(days).getByRole('button', { name: day }))
    }

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Wake up{Enter}')

    expect(emitted('save')).toBeUndefined()
    expect(days).toHaveAccessibleDescription('Choose at least one day.')
    expect(within(days).getByRole('button', { name: 'Monday' })).toHaveFocus()
  })

  test('does not save without a time, says why next to the time and moves focus there', async () => {
    const { emitted } = renderDialog()
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Wake up')

    await userEvent.clear(screen.getByLabelText('Time'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toBeUndefined()
    expect(screen.getByLabelText('Time')).toHaveAccessibleDescription('Choose a time.')
    expect(screen.getByLabelText('Time')).toHaveFocus()
  })

  test('does not save a one-time alarm without a date, says why next to the date and moves focus there', async () => {
    const { emitted } = renderDialog()
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Dentist')
    await userEvent.click(screen.getByRole('button', { name: 'Once' }))

    await userEvent.clear(screen.getByLabelText('Date'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toBeUndefined()
    expect(screen.getByLabelText('Date')).toHaveAccessibleDescription('Choose a date.')
    expect(screen.getByLabelText('Date')).toHaveFocus()
  })

  test('does not save a one-time alarm whose date and time have already passed, says why next to the date and moves focus there', async () => {
    const { emitted } = renderDialog({ now: at('2026-11-17T10:00') })
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Dentist')
    await userEvent.click(screen.getByRole('button', { name: 'Once' }))

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toBeUndefined()
    expect(screen.getByLabelText('Date')).toHaveAccessibleDescription('This date and time have already passed.')
    expect(screen.getByLabelText('Date')).toHaveFocus()
  })

  test('saves a used-up one-time alarm that is only renamed or given another ring sound, since that does not switch it on', async () => {
    const usedUp = { ...dentist, days: { kind: 'one-time', date: '2026-11-16' }, switchedOn: false } as const
    const { emitted } = renderDialog({ alarm: usedUp, now: at('2026-11-17T10:00') })
    const name = screen.getByRole('textbox', { name: 'Name' })

    await userEvent.clear(name)
    await userEvent.type(name, 'Dentist again')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Ring sound' }), 'Soft chime')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toEqual([[{ name: 'Dentist again', time: 15 * HOUR + 30 * MINUTE, days: { kind: 'one-time', date: '2026-11-16' }, sendsNotification: false, ringSound: { kind: 'built-in', name: 'soft chime' } }]])
  })

  test('still does not save a used-up one-time alarm moved to another date or time that has passed', async () => {
    const usedUp = { ...dentist, days: { kind: 'one-time', date: '2026-11-16' }, switchedOn: false } as const
    const { emitted } = renderDialog({ alarm: usedUp, now: at('2026-11-17T10:00') })

    await userEvent.clear(screen.getByLabelText('Date'))
    await userEvent.type(screen.getByLabelText('Date'), '2026-11-15')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toBeUndefined()
    expect(screen.getByLabelText('Date')).toHaveAccessibleDescription('This date and time have already passed.')
  })

  test('edits an alarm starting from what it has, and saves what is changed', async () => {
    const { emitted } = renderDialog({ alarm: dentist })
    const dialog = screen.getByRole('dialog', { name: 'Edit alarm' })

    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toHaveValue('Dentist')
    expect(within(dialog).getByLabelText('Time')).toHaveValue('15:30')
    expect(within(dialog).getByRole('button', { name: 'Once' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(dialog).getByLabelText('Date')).toHaveValue('2026-11-20')
    expect(within(dialog).getByRole('switch', { name: 'System notification' })).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Repeats' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(emitted('save')).toEqual([[{ name: 'Dentist', time: 15 * HOUR + 30 * MINUTE, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: false, ringSound: bell }]])
  })

  test('rings with the bell unless another ring sound is chosen, and saves the one chosen', async () => {
    const { emitted } = renderDialog()
    const ringSound = screen.getByRole('combobox', { name: 'Ring sound' })
    expect(ringSound).toHaveDisplayValue('Bell')

    await userEvent.selectOptions(ringSound, 'Soft chime')
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Wake up{Enter}')

    expect(emitted('save')).toEqual([[{ name: 'Wake up', time: 8 * HOUR, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: true, ringSound: { kind: 'built-in', name: 'soft chime' } }]])
  })

  test('edits an alarm starting from the ring sound it has', () => {
    renderDialog({ alarm: { ...dentist, ringSound: { kind: 'built-in', name: 'digital' } } })

    expect(screen.getByRole('combobox', { name: 'Ring sound' })).toHaveDisplayValue('Digital')
  })

  test('offers to delete the alarm only when editing it', async () => {
    const { emitted, rerender } = renderDialog({ alarm: dentist })

    await userEvent.click(screen.getByRole('button', { name: 'Delete Dentist' }))
    await rerender({ open: true, alarm: null })

    expect(emitted('remove')).toEqual([[]])
    expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument()
  })

  test('Cancel closes without saving', async () => {
    const { emitted } = renderDialog({ alarm: dentist })

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(emitted('close')).toEqual([[]])
    expect(emitted('save')).toBeUndefined()
  })

  test('fills in again each time it opens, with no error carried over', async () => {
    const { rerender } = renderDialog({ alarm: dentist })
    await userEvent.clear(screen.getByRole('textbox', { name: 'Name' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText('Give it a name.')).toBeInTheDocument()

    await rerender({ open: false, alarm: null })
    await rerender({ open: true, alarm: null })

    expect(screen.getByRole('dialog', { name: 'New alarm' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('')
    expect(screen.getByLabelText('Time')).toHaveValue('08:00')
    expect(screen.queryByText('Give it a name.')).not.toBeInTheDocument()
  })

  test('Escape closes it', async () => {
    const { emitted } = renderDialog()

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Wake up')
    await userEvent.keyboard('{Escape}')

    expect(emitted('close')).toEqual([[]])
    expect(emitted('save')).toBeUndefined()
  })
})
