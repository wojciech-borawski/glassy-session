import type { Ref } from 'vue'
import type { Refusal } from '../command/command-outcome'
import type { TimerCommand } from './commands'
import type { Timer } from './model/timer'

export type TimerStore = Readonly<{
  /** Gives the stored timers in the order they were saved, or none when nothing is stored yet. */
  load(): Promise<readonly Timer[]>
  save(timers: readonly Timer[]): Promise<void>
}>

/** Lets the person know that a timer has finished. */
export type Ringer = Readonly<{
  ring(timer: Timer): Promise<void>
}>

/** The stored timers as a context other than the background sees them, and the way it asks the background to change them. */
export type StoredTimers = Readonly<{
  /** The stored timers, kept current each time they are saved. */
  timers: Readonly<Ref<readonly Timer[]>>
  /** Sends a timer command. Resolves once it is applied with null, or with the refusal that says why it changed nothing. It never rejects. */
  send(command: TimerCommand): Promise<Refusal | null>
}>
