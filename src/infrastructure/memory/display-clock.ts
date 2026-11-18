import { readonly, ref } from 'vue'
import type { Duration, Moment } from '@/utils/time/units'

/** A display clock that only moves when told to, for Storybook and component tests. */
export function createManualClock(start: Moment) {
  const now = ref(start)
  return {
    now: readonly(now),
    advanceBy(duration: Duration) {
      now.value += duration
    }
  }
}
