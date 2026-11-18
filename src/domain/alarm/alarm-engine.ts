import type { Moment } from '@/utils/time/units'
import type { Refusal } from '../command/command-outcome'
import type { CommandQueue } from '../command/command-queue'
import type { WakeScheduler } from '../command/ports'
import type { AlarmCommand } from './commands'
import { changeAlarm, createAlarm, nextRingAfter, settle, switchesOnWhenChanged, switchOff, switchOn, type Alarm, type AlarmDetails, type NewAlarm, type UtcOffsetAt } from './model/alarm'
import type { AlarmRinger, AlarmStore } from './ports'

type AlarmEngineDependencies = Readonly<{
  inTurn: CommandQueue
  alarmStore: AlarmStore
  wakeScheduler: WakeScheduler
  ringer: AlarmRinger
  offsetAt: UtcOffsetAt
}>

export type AlarmEngine = ReturnType<typeof createAlarmEngine>

/**
 * The use cases the background runs on stored alarms, each in turn, so nothing is kept between calls.
 * Every one first settles the alarms from the moment stored as checked up to until now: an alarm due at most a minute ago rings,
 * and one due longer ago was missed and is told as missed instead. Then it applies the change, saves the alarms with now as checked up to,
 * sets a wake at each alarm's next ring and cancels the wakes of alarms that no longer ring. It rings last, so a worker that stops
 * after the save loses a ring rather than ringing twice.
 * A command for an alarm id that is not stored is refused as already removed and saves nothing. Adding an alarm whose id is
 * already stored changes nothing.
 */
export function createAlarmEngine(dependencies: AlarmEngineDependencies) {
  const { inTurn, alarmStore, wakeScheduler, ringer, offsetAt } = dependencies

  function run(now: Moment, change: (alarms: readonly Alarm[]) => readonly Alarm[] | Refusal) {
    return inTurn(async () => {
      const loaded = await alarmStore.load()
      const span = { from: loaded.checkedUpTo ?? now, to: now }
      const settled = loaded.alarms.map((alarm) => settle(alarm, span, offsetAt))
      const alarms = change(settled.map(({ alarm }) => alarm))
      if ('reason' in alarms) {
        return alarms
      }
      await alarmStore.save({ alarms, checkedUpTo: now })
      const ringing = new Set<string>()
      for (const alarm of alarms) {
        const ring = nextRingAfter(alarm, now, offsetAt)
        if (ring !== null) {
          ringing.add(alarm.id)
          await wakeScheduler.wakeAt({ of: 'alarm', id: alarm.id }, ring)
        }
      }
      for (const { id } of loaded.alarms) {
        if (!ringing.has(id)) {
          await wakeScheduler.cancel({ of: 'alarm', id })
        }
      }
      for (const { alarm, due } of settled) {
        if (due?.missed === true) {
          await ringer.tellMissed(alarm, due.at)
        } else if (due !== null) {
          await ringer.ring(alarm)
        }
      }
      return null
    })
  }

  /** Runs the change on the stored alarms when one of them has the id, and refuses it as already removed when none has. */
  function runOnStored(alarmId: string, now: Moment, change: (alarms: readonly Alarm[]) => readonly Alarm[] | Refusal) {
    return run(now, (alarms) => alarms.some((alarm) => alarm.id === alarmId) ? change(alarms) : { reason: 'already removed' })
  }

  function changeOne(alarmId: string, now: Moment, change: (alarm: Alarm) => Alarm) {
    return runOnStored(alarmId, now, (alarms) => alarms.map((alarm) => alarm.id === alarmId ? change(alarm) : alarm))
  }

  const engine = {
    add: (newAlarm: NewAlarm, now: Moment) => run(now, (alarms) =>
      alarms.some((alarm) => alarm.id === newAlarm.id) ? alarms : [...alarms, createAlarm(newAlarm)]),
    change: (alarmId: string, details: AlarmDetails, now: Moment) => changeOne(alarmId, now, (alarm) => {
      const changed = changeAlarm(alarm, details)
      return switchesOnWhenChanged(alarm, details, now, offsetAt) ? switchOn(changed) : changed
    }),
    remove: (alarmId: string, now: Moment) => runOnStored(alarmId, now, (alarms) => alarms.filter((alarm) => alarm.id !== alarmId)),
    switchOn: (alarmId: string, now: Moment) => runOnStored(alarmId, now, (alarms) => {
      const switchedOn = alarms.map((alarm) => alarm.id === alarmId ? switchOn(alarm) : alarm)
      const ringsAgain = switchedOn.some((alarm) => alarm.id === alarmId && nextRingAfter(alarm, now, offsetAt) !== null)
      return ringsAgain ? switchedOn : { reason: 'moment passed' }
    }),
    switchOff: (alarmId: string, now: Moment) => changeOne(alarmId, now, switchOff),
    /** Settles the alarms up to now and changes nothing else. The background runs it when a wake comes and when the browser starts. */
    catchUp: (now: Moment) => run(now, (alarms) => alarms)
  }

  /** Runs the alarm command with the use case it names. */
  function runCommand(command: AlarmCommand, now: Moment) {
    switch (command.type) {
    case 'add':
      return engine.add(command.alarm, now)
    case 'change':
      return engine.change(command.alarmId, command.details, now)
    default:
      return engine[command.type](command.alarmId, now)
    }
  }

  return { ...engine, run: runCommand }
}
