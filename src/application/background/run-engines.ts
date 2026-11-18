import { createAlarmEngine } from '@/domain/alarm/alarm-engine'
import { isAlarmCommand } from '@/domain/alarm/commands'
import { localUtcOffsetAt } from '@/domain/alarm/local-offset'
import type { Refusal } from '@/domain/command/command-outcome'
import { createCommandQueue } from '@/domain/command/command-queue'
import { createCommandRunner } from '@/domain/command/command-runner'
import { isMusicCommand, isSoundCommand } from '@/domain/music/commands'
import type { SoundOwner } from '@/domain/music/model/playback'
import { createMusicEngine } from '@/domain/music/music-engine'
import { createPlaybackEngine } from '@/domain/music/playback-engine'
import { isSessionCommand } from '@/domain/session/commands'
import { createSessionEngine } from '@/domain/session/session-engine'
import { ringSoundOf } from '@/domain/sound/model/sound'
import type { SoundUse } from '@/domain/sound/model/sound-use'
import { isTimerCommand } from '@/domain/timer/commands'
import { createTimerEngine } from '@/domain/timer/timer-engine'
import { localDayOf } from '@/domain/tracking/local-day'
import { createBrowserAlarmRinger } from '@/infrastructure/browser/alarm-ringer'
import { createBrowserAlarmStore } from '@/infrastructure/browser/alarm-store'
import { createBrowserAudioFileStore } from '@/infrastructure/browser/audio-file-store'
import { watchAudioFilesLetGo } from '@/infrastructure/browser/audio-files-let-go'
import { createBrowserChimer } from '@/infrastructure/browser/chimer'
import { answerCommand } from '@/infrastructure/browser/command-messages'
import { createBrowserMusicStore } from '@/infrastructure/browser/music-store'
import { createOffscreenPlayer } from '@/infrastructure/browser/offscreen-player'
import { createPagePlayer } from '@/infrastructure/browser/page-player'
import { createBrowserPlaybackStore } from '@/infrastructure/browser/playback-store'
import { createBrowserRinger } from '@/infrastructure/browser/ringer'
import { createBrowserSoundSettingsStore } from '@/infrastructure/browser/sound-settings-store'
import { createBrowserTimerStore } from '@/infrastructure/browser/timer-store'
import { createBrowserTimersAndSessionsStore } from '@/infrastructure/browser/timers-and-sessions-store'
import { createBrowserRepeatDayResultStore, createBrowserTrackedTimeStore } from '@/infrastructure/browser/tracked-time-store'
import { createBrowserWakeScheduler } from '@/infrastructure/browser/wake-scheduler'
import type { Moment } from '@/utils/time/units'

/** The person's own audio files, kept once for rings, chimes and playlists alike. */
const audioFiles = createBrowserAudioFileStore()

/** Firefox plays in its background page. A Chromium service worker cannot play audio, so it plays through the offscreen document. */
const sounding = {
  player: import.meta.env.BROWSER === 'firefox' ? createPagePlayer({ audioFiles }) : createOffscreenPlayer(),
  soundSettings: createBrowserSoundSettingsStore()
}

/** One scheduler for the wakes of timers, focus sessions and alarms, so a wake less than 30 seconds away settles them all. */
const wakeScheduler = createBrowserWakeScheduler(now)

const timerStore = createBrowserTimerStore()

const alarmStore = createBrowserAlarmStore()

const musicStore = createBrowserMusicStore()

/** Music commands and the playing of background sounds share one queue, so the playback follows each change to the music in its turn. */
const musicQueue = createCommandQueue()

const playback = createPlaybackEngine({ inTurn: musicQueue, musicStore, playbackStore: createBrowserPlaybackStore(), player: sounding.player })

const runner = createCommandRunner({
  inTurn: createCommandQueue(),
  store: createBrowserTimersAndSessionsStore(),
  trackedTimeStore: createBrowserTrackedTimeStore(),
  repeatDayResultStore: createBrowserRepeatDayResultStore(),
  wakeScheduler,
  ringer: createBrowserRinger(sounding),
  chimer: createBrowserChimer(sounding),
  dayOf: localDayOf,
  soundOwners: (events) => void playback.ownersChanged(events)
})

const timers = createTimerEngine(runner)

const sessions = createSessionEngine(runner)

/** Alarms touch no timer, focus session or tracked time, so they run in their own queue over their own stored item. */
const alarms = createAlarmEngine({
  inTurn: createCommandQueue(),
  alarmStore,
  wakeScheduler,
  ringer: createBrowserAlarmRinger(sounding),
  offsetAt: localUtcOffsetAt
})

/** The sounds that timers and alarms ring with and the chosen chimes, with what plays each, so no audio file one of them plays is forgotten. */
async function soundUses(): Promise<readonly SoundUse[]> {
  const [storedTimers, { alarms: storedAlarms }, { endChime, startChime }] = await Promise.all([timerStore.load(), alarmStore.load(), sounding.soundSettings.load()])
  return [
    ...storedTimers.map((timer) => ({ sound: ringSoundOf(timer), by: { kind: 'timer', name: timer.name } } as const)),
    ...storedAlarms.map((alarm) => ({ sound: ringSoundOf(alarm), by: { kind: 'alarm', name: alarm.name } } as const)),
    { sound: endChime, by: { kind: 'end chime' } },
    { sound: startChime, by: { kind: 'start chime' } }
  ]
}

/** Playlists touch no timer, focus session or tracked time either, and need no clock. */
const music = createMusicEngine({
  inTurn: musicQueue,
  musicStore,
  audioFiles,
  soundUses,
  followMusic: playback.followMusic
})

function now(): Moment {
  return Date.now()
}

/** A timer or focus session that a remove command leaves unstored, whether it removed it or found it already gone, takes its background sound with it right after. One the remove was refused for keeps it. */
async function removing(running: Promise<Refusal | null>, owner: SoundOwner): Promise<Refusal | null> {
  const refusal = await running
  if (refusal === null || refusal.reason === 'already removed') {
    await music.forgetSoundOf(owner)
  }
  return refusal
}

function runCommand(message: unknown): Promise<Refusal | null> | null {
  if (isTimerCommand(message)) {
    return message.type === 'remove' ? removing(timers.run(message, now()), { of: 'timer', id: message.timerId }) : timers.run(message, now())
  }
  if (isAlarmCommand(message)) {
    return alarms.run(message, now())
  }
  if (isMusicCommand(message)) {
    return music.run(message)
  }
  if (isSoundCommand(message)) {
    return playback.run(message)
  }
  if (!isSessionCommand(message)) {
    return null
  }
  return message.type === 'remove' ? removing(sessions.run(message, now()), { of: 'focus session', id: message.sessionId }) : sessions.run(message, now())
}

/** Every command settles all timers and focus sessions before it changes anything, so whatever a wake is for, settling is all it needs. */
async function settleEverything() {
  await sessions.settleAll(now())
  await alarms.catchUp(now())
}

/** The browser starting or the extension being updated may have cleared the wakes, so every one is set again. */
async function settleEverythingAtStart() {
  await sessions.settleAllAtStart(now())
  await alarms.catchUp(now())
}

/** Registers the background's listeners. Call it synchronously when the background starts. */
export function runEngines() {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const running = runCommand(message)
    if (running === null) {
      return
    }
    void answerCommand(running).then(sendResponse)
    return true
  })
  sounding.player.onFileEnded((fileId) => void playback.fileEnded(fileId))
  sounding.player.onFileCannotPlay((fileId) => void playback.fileCannotPlay(fileId))
  sounding.player.onFilePlace((fileId, at) => void playback.placeReported(fileId, at))
  void playback.restore(settleEverything)
  wakeScheduler.onWake(settleEverything)
  watchAudioFilesLetGo((fileIds) => void music.forgetUnusedFiles(fileIds))
  browser.runtime.onStartup.addListener(settleEverythingAtStart)
  browser.runtime.onInstalled.addListener(settleEverythingAtStart)
}
