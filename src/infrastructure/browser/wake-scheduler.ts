import type { Wake, WakeAt, WakeScheduler } from '@/domain/command/ports'
import type { Duration, Moment } from '@/utils/time/units'

const WAKE_PREFIX = 'wake:'

const ALARM_PREFIXES: Readonly<Record<Wake['of'], string>> = {
  'timer': `${WAKE_PREFIX}timer:`,
  'focus session': `${WAKE_PREFIX}session:`,
  'alarm': `${WAKE_PREFIX}alarm:`
}

/** How long Chromium may hold back a packed extension's alarm: 30 seconds after it was set or after another alarm fired, as MDN's alarms.create says. */
const ALARM_DELAY_AT_MOST: Duration = 30_000

function alarmName({ of, id }: Wake) {
  return `${ALARM_PREFIXES[of]}${id}`
}

function wakeOf(name: string): Wake | null {
  const kinds = Object.keys(ALARM_PREFIXES) as Wake['of'][]
  const of = kinds.find((kind) => name.startsWith(ALARM_PREFIXES[kind]))
  return of === undefined ? null : { of, id: name.slice(ALARM_PREFIXES[of].length) }
}

export type BrowserWakeScheduler = WakeScheduler & Readonly<{
  /** Calls the listener when a wake comes. Register it synchronously when the background starts. */
  onWake(listener: () => Promise<void>): void
}>

/**
 * One browser alarm per wake. A moment already past still fires.
 * A packed Chromium extension's alarms fire at most once every 30 seconds, so a wake less than 30 seconds away also gets a timeout
 * in the running background, which stays alive about 30 seconds after its last event. The alarm stays as the backstop for a background
 * that stops before. A wake may so come twice, which does no harm, since a wake only settles what is due.
 * The background reads the clock only through `now`.
 */
export function createBrowserWakeScheduler(now: () => Moment): BrowserWakeScheduler {
  const timeouts = new Map<string, ReturnType<typeof setTimeout>>()
  let woken: () => Promise<void> = async () => {}

  function clearTimeoutOf(name: string) {
    clearTimeout(timeouts.get(name))
    timeouts.delete(name)
  }

  function wakeSoon(name: string, moment: Moment) {
    clearTimeoutOf(name)
    const delay = moment - now()
    if (delay >= ALARM_DELAY_AT_MOST) {
      return
    }
    timeouts.set(name, setTimeout(() => {
      timeouts.delete(name)
      if (now() < moment) {
        wakeSoon(name, moment)
        return
      }
      void woken()
    }, Math.max(0, delay)))
  }

  /** Gives each wake that is set and less than 30 seconds away a timeout, since an alarm that just fired holds back the others. */
  async function wakeSoonAfterAlarm() {
    for (const { name, scheduledTime } of await browser.alarms.getAll()) {
      if (name.startsWith(WAKE_PREFIX) && !timeouts.has(name)) {
        wakeSoon(name, scheduledTime)
      }
    }
  }

  return {
    async wakeAt(wake, moment) {
      await browser.alarms.create(alarmName(wake), { when: moment })
      wakeSoon(alarmName(wake), moment)
    },
    async cancel(wake) {
      clearTimeoutOf(alarmName(wake))
      await browser.alarms.clear(alarmName(wake))
    },
    async scheduled() {
      return (await browser.alarms.getAll()).flatMap(({ name, scheduledTime }): WakeAt[] => {
        const wake = wakeOf(name)
        return wake === null ? [] : [{ wake, moment: scheduledTime }]
      })
    },
    onWake(listener) {
      woken = listener
      browser.alarms.onAlarm.addListener(async (alarm) => {
        if (alarm.name.startsWith(WAKE_PREFIX)) {
          await listener()
          await wakeSoonAfterAlarm()
        }
      })
    }
  }
}
