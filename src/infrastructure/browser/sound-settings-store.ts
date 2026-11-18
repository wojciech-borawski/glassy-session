import { defaultSoundSettings, isSound, type SoundSettings } from '@/domain/sound/model/sound'
import type { SoundSettingsStore } from '@/domain/sound/ports'
import { storedSoundSettings } from './storage-items'

const isVolume = (value: unknown): value is number => typeof value === 'number' && value >= 0 && value <= 1

/** The sound settings in extension storage. Each saved setting this version does not have reads as its default. */
export function createBrowserSoundSettingsStore(): SoundSettingsStore {
  return {
    async load() {
      const saved: Partial<Record<keyof SoundSettings, unknown>> = await storedSoundSettings.getValue()
      return {
        endChime: isSound(saved.endChime) ? saved.endChime : defaultSoundSettings.endChime,
        startChime: isSound(saved.startChime) ? saved.startChime : defaultSoundSettings.startChime,
        volume: isVolume(saved.volume) ? saved.volume : defaultSoundSettings.volume
      }
    },
    save: (settings) => storedSoundSettings.setValue(settings)
  }
}
