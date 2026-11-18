import type { OwnerEvent, SoundOwner } from '../music/model/playback'
import { progressAt, type FocusSession } from '../session/model/focus-session'
import type { Timer } from '../timer/model/timer'

type Stored = Readonly<{ timers: readonly Timer[], sessions: readonly FocusSession[] }>

/** Where a sound owner is for its background sound: running, paused with its place kept, or neither. */
type Hold = 'running' | 'paused' | null

function holdOfTimer(timer: Timer | undefined): Hold {
  if (timer === undefined) {
    return null
  }
  if (timer.runningSince !== null) {
    return 'running'
  }
  return timer.remainingTime > 0 && timer.remainingTime < timer.plannedTime ? 'paused' : null
}

function holdOfSession(session: FocusSession | undefined): Hold {
  const run = session?.run ?? null
  if (run === null) {
    return null
  }
  return run.paused ? 'paused' : 'running'
}

/** The focus step or break a session counting down is in as stored, or null for a session that is not counting down. */
function partOf(session: FocusSession | undefined): Readonly<{ kind: 'focus step' | 'break', step: number | null }> | null {
  const run = session?.run ?? null
  if (session === undefined || run === null || run.paused) {
    return null
  }
  const { state, currentStep } = progressAt(session, run.since)
  return state === 'focus step' || state === 'break' ? { kind: state, step: currentStep } : null
}

/** A break or a focus step that began while the session ran on. */
function partEvents(before: FocusSession | undefined, after: FocusSession | undefined): OwnerEvent[] {
  const [was, is] = [partOf(before), partOf(after)]
  if (was === null || is === null || (was.kind === is.kind && was.step === is.step)) {
    return []
  }
  return [{ type: is.kind === 'break' ? 'break started' : 'focus step started' }]
}

function eventsOf(owner: SoundOwner, was: Hold, is: Hold): OwnerEvent[] {
  if (was === is) {
    return []
  }
  if (is === 'running') {
    return [{ type: was === 'paused' ? 'owner resumed' : 'owner started', owner }]
  }
  if (is === 'paused') {
    return was === 'running' ? [{ type: 'owner paused', owner }] : []
  }
  return [{ type: 'owner finished', owner }]
}

const idsOf = (...lists: readonly (readonly Readonly<{ id: string }>[])[]) => [...new Set(lists.flatMap((list) => list.map(({ id }) => id)))]

export function soundOwnerEventsBetween(before: Stored, after: Stored): readonly OwnerEvent[] {
  const withId = <Owner extends Readonly<{ id: string }>>(owners: readonly Owner[], ownerId: string) => owners.find(({ id }) => id === ownerId)
  const timerEvents = idsOf(before.timers, after.timers).flatMap((timerId) =>
    eventsOf({ of: 'timer', id: timerId }, holdOfTimer(withId(before.timers, timerId)), holdOfTimer(withId(after.timers, timerId))))
  const sessionEvents = idsOf(before.sessions, after.sessions).flatMap((sessionId) => {
    const [was, is] = [withId(before.sessions, sessionId), withId(after.sessions, sessionId)]
    return [...eventsOf({ of: 'focus session', id: sessionId }, holdOfSession(was), holdOfSession(is)), ...partEvents(was, is)]
  })
  return [...timerEvents, ...sessionEvents]
}
