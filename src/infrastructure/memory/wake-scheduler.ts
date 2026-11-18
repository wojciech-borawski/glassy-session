import type { Wake, WakeAt, WakeScheduler } from '@/domain/command/ports'
import type { Moment } from '@/utils/time/units'

/** Keeps the wakes in a map by `of:id`, and in `set` every wake set, in order, so a test sees a wake set again at the same moment. */
export function createMemoryWakeScheduler(): WakeScheduler & { wakes: ReadonlyMap<string, Moment>, set: readonly (readonly [string, Moment])[] } {
  const wakes = new Map<string, Moment>()
  const scheduled = new Map<string, WakeAt>()
  const set: (readonly [string, Moment])[] = []
  const keyOf = ({ of, id }: Wake) => `${of}:${id}`
  return {
    wakes,
    set,
    async wakeAt(wake, moment) {
      wakes.set(keyOf(wake), moment)
      scheduled.set(keyOf(wake), { wake, moment })
      set.push([keyOf(wake), moment])
    },
    async cancel(wake) {
      wakes.delete(keyOf(wake))
      scheduled.delete(keyOf(wake))
    },
    async scheduled() {
      return [...scheduled.values()]
    }
  }
}
