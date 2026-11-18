import type { Ref } from 'vue'
import type { Refusal } from '../command/command-outcome'
import type { SessionCommand } from './commands'
import type { Ending, FocusSession } from './model/focus-session'

export type SessionStore = Readonly<{
  /** Gives the stored focus sessions in the order they were saved, or none when nothing is stored yet. */
  load(): Promise<readonly FocusSession[]>
  save(sessions: readonly FocusSession[]): Promise<void>
}>

/** Lets the person know where a focus session has got to. A break that ends plays the start chime, a focus step or the whole session that ends plays the end chime. */
export type Chimer = Readonly<{
  chime(session: FocusSession, ending: Ending): Promise<void>
}>

/** The stored focus sessions as a context other than the background sees them, and the way it asks the background to change them. */
export type StoredSessions = Readonly<{
  /** The stored focus sessions, kept current each time they are saved. */
  sessions: Readonly<Ref<readonly FocusSession[]>>
  /** Sends a focus session command. Resolves once it is applied with null, or with the refusal that says why it changed nothing. It never rejects. */
  send(command: SessionCommand): Promise<Refusal | null>
}>
