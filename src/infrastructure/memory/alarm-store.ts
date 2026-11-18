import type { AlarmStore, SavedAlarms } from '@/domain/alarm/ports'

export function createMemoryAlarmStore(saved: SavedAlarms = { alarms: [], checkedUpTo: null }): AlarmStore {
  let stored = saved
  return {
    async load() {
      return stored
    },
    async save(saved) {
      stored = saved
    }
  }
}
