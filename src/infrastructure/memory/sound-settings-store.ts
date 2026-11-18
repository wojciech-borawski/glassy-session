import { defaultSoundSettings, type SoundSettings } from '@/domain/sound/model/sound'
import type { SoundSettingsStore } from '@/domain/sound/ports'

/** Sound settings kept in memory, starting from the given ones or the defaults. */
export function createMemorySoundSettingsStore(initial: SoundSettings = defaultSoundSettings): SoundSettingsStore {
  let settings = initial
  return {
    async load() {
      return settings
    },
    async save(saved) {
      settings = saved
    }
  }
}
