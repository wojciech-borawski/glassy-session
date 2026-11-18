import { shallowRef } from 'vue'
import { createAlarmEngine } from '@/domain/alarm/alarm-engine'
import { localUtcOffsetAt } from '@/domain/alarm/local-offset'
import type { Alarm } from '@/domain/alarm/model/alarm'
import type { StoredAlarms } from '@/domain/alarm/ports'
import { failure } from '@/domain/command/command-outcome'
import { createCommandQueue } from '@/domain/command/command-queue'
import type { Moment } from '@/utils/time/units'
import { createMemoryAlarmRinger } from './alarm-ringer'
import { createMemoryAlarmStore } from './alarm-store'
import { createMemoryWakeScheduler } from './wake-scheduler'

type MemoryStoredAlarmsOptions = Readonly<{
  /** The moment each command runs at. */
  now: () => Moment
  /** The alarms stored at first. Defaults to none. */
  alarms?: readonly Alarm[]
}>

/** Stored alarms that run each command on the real alarm engine over in-memory adapters, for Storybook and component tests. */
export function createMemoryStoredAlarms({ now, alarms = [] }: MemoryStoredAlarmsOptions): StoredAlarms {
  const alarmStore = createMemoryAlarmStore({ alarms, checkedUpTo: now() })
  const engine = createAlarmEngine({
    inTurn: createCommandQueue(),
    alarmStore,
    wakeScheduler: createMemoryWakeScheduler(),
    ringer: createMemoryAlarmRinger(),
    offsetAt: localUtcOffsetAt
  })
  const stored = shallowRef(alarms)
  return {
    alarms: stored,
    async send(command) {
      try {
        const refusal = await engine.run(command, now())
        stored.value = (await alarmStore.load()).alarms
        return refusal
      } catch (error) {
        return failure(error)
      }
    }
  }
}
