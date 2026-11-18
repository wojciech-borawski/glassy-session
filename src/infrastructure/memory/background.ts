import { shallowRef } from 'vue'
import { failure, type Refusal } from '@/domain/command/command-outcome'
import { createCommandQueue } from '@/domain/command/command-queue'
import { createCommandRunner } from '@/domain/command/command-runner'
import type { Playback } from '@/domain/music/model/playback'
import type { SavedMusic, StoredPlaylists } from '@/domain/music/ports'
import type { FocusSession } from '@/domain/session/model/focus-session'
import type { StoredSessions } from '@/domain/session/ports'
import { createSessionEngine } from '@/domain/session/session-engine'
import type { Timer } from '@/domain/timer/model/timer'
import type { StoredTimers } from '@/domain/timer/ports'
import { createTimerEngine } from '@/domain/timer/timer-engine'
import { localDayOf } from '@/domain/tracking/local-day'
import type { RepeatDayResults } from '@/domain/tracking/model/repeat-day-results'
import type { TrackedTime } from '@/domain/tracking/model/tracked-time'
import type { StoredTrackedTime } from '@/domain/tracking/ports'
import type { Moment } from '@/utils/time/units'
import { createMemoryChimer } from './chimer'
import { createMemoryRepeatDayResultStore } from './repeat-day-result-store'
import { createMemoryRinger } from './ringer'
import { createMemorySessionStore } from './session-store'
import { createMemoryMusic } from './stored-playlists'
import { createMemoryTimerStore } from './timer-store'
import { createMemoryTimersAndSessionsStore } from './timers-and-sessions-store'
import { createMemoryTrackedTimeStore } from './tracked-time-store'
import { createMemoryWakeScheduler } from './wake-scheduler'

type MemoryBackgroundOptions = Readonly<{
  /** The moment each command runs at. */
  now: () => Moment
  /** The timers stored at first. Defaults to none. */
  timers?: readonly Timer[]
  /** The focus sessions stored at first. Defaults to none. */
  sessions?: readonly FocusSession[]
  /** The tracked time stored at first. Defaults to none. */
  trackedTime?: TrackedTime
  /** The repeat day results stored at first. Defaults to none. */
  repeatDayResults?: RepeatDayResults
  /** The playlists and background sounds stored at first. Defaults to none. */
  music?: SavedMusic
  /** The playback stored at first. Defaults to no sound heard. */
  playback?: Playback
}>

export type MemoryBackground = Readonly<{ storedTimers: StoredTimers, storedSessions: StoredSessions, storedTrackedTime: StoredTrackedTime, storedPlaylists: StoredPlaylists }>

/**
 * Stored timers and focus sessions that run each command on the real engines over one set of in-memory adapters, for Storybook and component tests.
 * After every command both follow what it saved, since a command of either kind settles timers and focus sessions alike, and the tracked time follows the spans and repeat day results it recorded.
 * The stored playlists run music and sound commands, and their playback follows what each timer or focus session command made the owners do.
 */
export function createMemoryBackground({ now, timers = [], sessions = [], trackedTime = {}, repeatDayResults = {}, music, playback }: MemoryBackgroundOptions): MemoryBackground {
  const timerStore = createMemoryTimerStore(timers)
  const sessionStore = createMemorySessionStore(sessions)
  const trackedTimeStore = createMemoryTrackedTimeStore(trackedTime)
  const repeatDayResultStore = createMemoryRepeatDayResultStore(repeatDayResults)
  const memoryMusic = createMemoryMusic(music, playback)
  let soundFollowed: Promise<void> = Promise.resolve()
  const run = createCommandRunner({
    inTurn: createCommandQueue(),
    store: createMemoryTimersAndSessionsStore(timerStore, sessionStore),
    trackedTimeStore,
    repeatDayResultStore,
    wakeScheduler: createMemoryWakeScheduler(),
    ringer: createMemoryRinger(),
    chimer: createMemoryChimer(),
    dayOf: localDayOf,
    soundOwners: (events) => {
      soundFollowed = memoryMusic.ownersChanged(events)
    }
  })
  const timerEngine = createTimerEngine(run, localDayOf)
  const sessionEngine = createSessionEngine(run)
  const storedTimers = shallowRef(timers)
  const storedSessions = shallowRef(sessions)
  const storedTrackedTime = shallowRef(trackedTime)
  const storedRepeatDayResults = shallowRef(repeatDayResults)

  async function following(running: () => Promise<Refusal | null>): Promise<Refusal | null> {
    try {
      const refusal = await running()
      storedTimers.value = await timerStore.load()
      storedSessions.value = await sessionStore.load()
      storedTrackedTime.value = await trackedTimeStore.load()
      storedRepeatDayResults.value = await repeatDayResultStore.load()
      await soundFollowed
      return refusal
    } catch (error) {
      return failure(error)
    }
  }

  return {
    storedTimers: { timers: storedTimers, send: (command) => following(() => timerEngine.run(command, now())) },
    storedSessions: { sessions: storedSessions, send: (command) => following(() => sessionEngine.run(command, now())) },
    storedTrackedTime: { trackedTime: storedTrackedTime, repeatDayResults: storedRepeatDayResults },
    storedPlaylists: memoryMusic.storedPlaylists
  }
}
