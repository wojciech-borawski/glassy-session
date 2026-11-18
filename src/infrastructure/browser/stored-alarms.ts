import { getCurrentScope, onScopeDispose, shallowRef } from 'vue'
import type { Alarm } from '@/domain/alarm/model/alarm'
import type { StoredAlarms } from '@/domain/alarm/ports'
import { sendAlarmCommand } from './alarm-commands'
import { readStoredAlarms, watchStoredAlarms } from './alarm-store'

/**
 * The stored alarms read from extension storage and followed through its change events, with commands sent to the background.
 * A save heard before the first read finishes wins over what that read found.
 * Created inside a component or effect scope, it stops following storage when that scope ends.
 */
export function createBrowserStoredAlarms(): StoredAlarms {
  const alarms = shallowRef<readonly Alarm[]>([])
  let heardASave = false
  const stopWatching = watchStoredAlarms((saved) => {
    heardASave = true
    alarms.value = saved
  })
  void readStoredAlarms().then((read) => {
    if (!heardASave) {
      alarms.value = read
    }
  })
  if (getCurrentScope()) {
    onScopeDispose(stopWatching)
  }
  return { alarms, send: sendAlarmCommand }
}
