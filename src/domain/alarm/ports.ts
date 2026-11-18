import type { Ref } from 'vue'
import type { Moment } from '@/utils/time/units'
import type { Refusal } from '../command/command-outcome'
import type { AlarmCommand } from './commands'
import type { Alarm } from './model/alarm'

/** The stored alarms, and the moment they were last settled up to, which is null before anything was stored. */
export type SavedAlarms = Readonly<{ alarms: readonly Alarm[], checkedUpTo: Moment | null }>

export type AlarmStore = Readonly<{
  /** Gives the stored alarms in the order they were saved, or none when nothing is stored yet. */
  load(): Promise<SavedAlarms>
  save(saved: SavedAlarms): Promise<void>
}>

/** Lets the person know that an alarm's moment has come, or that it came while the browser could not ring. */
export type AlarmRinger = Readonly<{
  /** Rings the alarm, with a system notification when the alarm sends one. */
  ring(alarm: Alarm): Promise<void>
  /** Shows one quiet system notification saying when the alarm was due. Nothing rings. */
  tellMissed(alarm: Alarm, dueAt: Moment): Promise<void>
}>

/** The stored alarms as a context other than the background sees them, and the way it asks the background to change them. */
export type StoredAlarms = Readonly<{
  /** The stored alarms, kept current each time they are saved. */
  alarms: Readonly<Ref<readonly Alarm[]>>
  /** Sends an alarm command. Resolves once it is applied with null, or with the refusal that says why it changed nothing. It never rejects. */
  send(command: AlarmCommand): Promise<Refusal | null>
}>
