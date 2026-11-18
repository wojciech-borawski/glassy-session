import { getCurrentScope, onScopeDispose, shallowRef, type Ref } from 'vue'

/**
 * A value read from extension storage and then followed through its change events.
 * A save heard before the first read finishes wins over what that read found.
 * Created inside a component or effect scope, it stops following storage when that scope ends.
 */
export function followStorage<Value>(empty: Value, read: () => Promise<Value>, watch: (listener: (saved: Value) => void) => () => void): Readonly<Ref<Value>> {
  const value = shallowRef(empty)
  let heardASave = false
  const stopWatching = watch((saved) => {
    heardASave = true
    value.value = saved
  })
  void read().then((found) => {
    if (!heardASave) {
      value.value = found
    }
  })
  if (getCurrentScope()) {
    onScopeDispose(stopWatching)
  }
  return value
}
