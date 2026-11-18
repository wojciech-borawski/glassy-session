import { useSnackbar } from '@/ui/n-snackbar/snackbar'
import type { Refusal } from '../command/command-outcome'
import { whyRefused } from '../command/why-refused'
import { useDisplayClock } from '../display-clock'
import type { AlarmCommand } from './commands'
import { localUtcOffsetAt } from './local-offset'
import { switchesOnWhenChanged, type Alarm, type AlarmDetails } from './model/alarm'
import { useStoredAlarms } from './stored-alarms'

/** Sends alarm commands through the stored alarms and says in the snackbar what each one did, or why it did nothing. */
export function useAlarmCommands() {
  const { send } = useStoredAlarms()
  const { show } = useSnackbar()
  const now = useDisplayClock()
  const { t } = useI18n()

  async function run(command: AlarmCommand, done: string): Promise<Refusal | null> {
    const refusal = await send(command)
    show(refusal === null ? done : whyRefused(refusal, t))
    return refusal
  }

  return {
    add: (details: AlarmDetails) =>
      run({ type: 'add', alarm: { id: crypto.randomUUID(), ...details } }, t('alarmCommand.added', { name: details.name })),
    change: (alarm: Alarm, details: AlarmDetails) => {
      const saved = switchesOnWhenChanged(alarm, details, now.value, localUtcOffsetAt) ? 'savedAndSwitchedOn' : 'saved'
      return run({ type: 'change', alarmId: alarm.id, details }, t(`alarmCommand.${saved}`, { name: details.name }))
    },
    remove: (alarm: Alarm) => run({ type: 'remove', alarmId: alarm.id }, t('alarmCommand.removed', { name: alarm.name })),
    switchOn: (alarm: Alarm) => run({ type: 'switchOn', alarmId: alarm.id }, t('alarmCommand.switchedOn', { name: alarm.name })),
    switchOff: (alarm: Alarm) => run({ type: 'switchOff', alarmId: alarm.id }, t('alarmCommand.switchedOff', { name: alarm.name }))
  }
}
