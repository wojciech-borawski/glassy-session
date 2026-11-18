import type { Alarm } from '@/domain/alarm/model/alarm'
import type { AlarmStore } from '@/domain/alarm/ports'
import { storedAlarms } from './storage-items'

/** The background's store. Other contexts read alarms with readStoredAlarms and change them only through commands. */
export function createBrowserAlarmStore(): AlarmStore {
  return {
    load: () => storedAlarms.getValue(),
    save: (saved) => storedAlarms.setValue(saved)
  }
}

export async function readStoredAlarms(): Promise<readonly Alarm[]> {
  return (await storedAlarms.getValue()).alarms
}

/** Calls the listener with the stored alarms each time they are saved, until the returned function is called. */
export function watchStoredAlarms(listener: (alarms: readonly Alarm[]) => void): () => void {
  return storedAlarms.watch((saved) => listener(saved.alarms))
}
