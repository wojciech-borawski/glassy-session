import { render, screen } from '@testing-library/vue'
import { defineComponent, h, shallowRef } from 'vue'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { createMemoryStoredAlarms } from '@/infrastructure/memory/stored-alarms'
import NSnackbar from '@/ui/n-snackbar/index.vue'
import { provideSnackbar } from '@/ui/n-snackbar/snackbar'
import type { Refusal } from '../command/command-outcome'
import { provideDisplayClock } from '../display-clock'
import { createAlarm, type Alarm } from './model/alarm'
import type { StoredAlarms } from './ports'
import { provideStoredAlarms } from './stored-alarms'
import { useAlarmCommands } from './use-alarm-commands'

const HOUR = 3_600_000
const NINE = new Date(2026, 10, 17, 9).getTime()

type AlarmCommands = ReturnType<typeof useAlarmCommands>

const wakeUp = createAlarm({ id: 'wake-up', name: 'Wake up', time: 7 * HOUR, days: { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] }, sendsNotification: true })

function renderCommands(storedAlarms: StoredAlarms) {
  let commands: AlarmCommands | undefined
  const Uses = defineComponent({
    setup() {
      commands = useAlarmCommands()
      return () => null
    }
  })
  render(defineComponent({
    setup() {
      provideStoredAlarms(storedAlarms)
      provideDisplayClock(shallowRef(NINE))
      const { messages } = provideSnackbar()
      return () => [h(NSnackbar, { messages: messages.value }), h(Uses)]
    }
  }), { global: { plugins: [createAppI18n()] } })
  if (commands === undefined) throw new Error('not rendered')
  return commands
}

describe('the alarm commands a view sends', () => {
  test('switch a stored alarm off and say so in the snackbar', async () => {
    const storedAlarms = createMemoryStoredAlarms({ now: () => NINE, alarms: [wakeUp] })

    expect(await renderCommands(storedAlarms).switchOff(wakeUp)).toBeNull()

    expect(storedAlarms.alarms.value).toEqual([{ ...wakeUp, switchedOn: false }])
    expect(await screen.findByRole('status')).toHaveTextContent('Wake up switched off')
  })

  const switchedOff = { ...wakeUp, switchedOn: false }
  const dentist = { name: 'Dentist', time: 15 * HOUR, days: { kind: 'one-time', date: '2026-11-20' }, sendsNotification: false } as const

  test.each([
    { does: 'switch an alarm on', run: (commands: AlarmCommands) => commands.switchOn(switchedOff), says: 'Wake up switched on', leaves: (alarms: readonly Alarm[]) => alarms[0]?.switchedOn === true },
    { does: 'remove an alarm', run: (commands: AlarmCommands) => commands.remove(switchedOff), says: 'Wake up removed', leaves: (alarms: readonly Alarm[]) => alarms.length === 0 },
    {
      does: 'save new details of an alarm',
      run: (commands: AlarmCommands) => commands.change(switchedOff, { ...dentist, name: 'Get up' }),
      says: 'Get up saved',
      leaves: (alarms: readonly Alarm[]) => alarms[0]?.name === 'Get up' && alarms[0].switchedOn === false
    },
    {
      does: 'add an alarm',
      run: (commands: AlarmCommands) => commands.add(dentist),
      says: 'Dentist added',
      leaves: (alarms: readonly Alarm[]) => alarms[1]?.name === 'Dentist' && alarms[1].switchedOn && alarms[1].id !== ''
    }
  ])('$does and say so in the snackbar', async ({ run, says, leaves }) => {
    const storedAlarms = createMemoryStoredAlarms({ now: () => NINE, alarms: [switchedOff] })

    expect(await run(renderCommands(storedAlarms))).toBeNull()

    expect(leaves(storedAlarms.alarms.value)).toBe(true)
    expect(await screen.findByRole('status')).toHaveTextContent(says)
  })

  test.each([
    { refusal: { reason: 'failed', message: 'A repeating alarm needs at least one repeat day' }, says: 'That did not work: A repeating alarm needs at least one repeat day' },
    { refusal: { reason: 'task in use', task: { id: 'write-report', name: 'Write report' }, usedIn: null }, says: 'Write report is already running on its own' }
  ] satisfies { refusal: Refusal, says: string }[])('say why a refused command changed nothing: $says', async ({ refusal, says }) => {
    const refusing: StoredAlarms = { alarms: shallowRef([wakeUp]), send: async () => refusal }

    expect(await renderCommands(refusing).switchOff(wakeUp)).toEqual(refusal)

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent(says)
    expect(status).not.toHaveTextContent('switched off')
  })

  test('save a used-up one-time alarm moved to a day to come and say that it is switched on again', async () => {
    const usedUp = { ...createAlarm({ id: 'dentist', ...dentist, days: { kind: 'one-time', date: '2026-11-17' }, time: 8 * HOUR }), switchedOn: false }
    const storedAlarms = createMemoryStoredAlarms({ now: () => NINE, alarms: [usedUp] })

    expect(await renderCommands(storedAlarms).change(usedUp, { ...dentist, time: 8 * HOUR })).toBeNull()

    expect(storedAlarms.alarms.value[0]?.switchedOn).toBe(true)
    expect(await screen.findByRole('status')).toHaveTextContent('Dentist saved and switched on')
  })

  test('say that an alarm switched off after it was removed was already removed', async () => {
    const storedAlarms = createMemoryStoredAlarms({ now: () => NINE, alarms: [] })

    expect(await renderCommands(storedAlarms).switchOff(wakeUp)).toEqual({ reason: 'already removed' })

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('It was already removed')
    expect(status).not.toHaveTextContent('switched off')
  })
})
