import { getCurrentScope, onScopeDispose, shallowRef, type Ref } from 'vue'
import type { StoredTrackedTime } from '@/domain/tracking/ports'
import { readStoredRepeatDayResults, readStoredTrackedTime, watchStoredRepeatDayResults, watchStoredTrackedTime } from './tracked-time-store'

/** A stored value read once and then followed through its change events, where a save heard before the read finishes wins over that read. */
function follow<Value>(read: () => Promise<Value>, watch: (listener: (saved: Value) => void) => () => void, empty: Value): { value: Ref<Value>, stop: () => void } {
  const value = shallowRef<Value>(empty)
  let heardASave = false
  const stop = watch((saved) => {
    heardASave = true
    value.value = saved
  })
  void read().then((readValue) => {
    if (!heardASave) {
      value.value = readValue
    }
  })
  return { value, stop }
}

/**
 * The stored tracked time and repeat day results read from extension storage and followed through their change events.
 * A save heard before the first read finishes wins over what that read found.
 * Created inside a component or effect scope, it stops following storage when that scope ends.
 */
export function createBrowserStoredTrackedTime(): StoredTrackedTime {
  const trackedTime = follow(readStoredTrackedTime, watchStoredTrackedTime, {})
  const repeatDayResults = follow(readStoredRepeatDayResults, watchStoredRepeatDayResults, {})
  if (getCurrentScope()) {
    onScopeDispose(() => {
      trackedTime.stop()
      repeatDayResults.stop()
    })
  }
  return { trackedTime: trackedTime.value, repeatDayResults: repeatDayResults.value }
}
