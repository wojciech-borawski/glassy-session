import { shallowRef } from 'vue'
import { defaultOverlaySettings, type OverlaySettings } from '@/domain/overlay/model/overlay-settings'
import type { StoredOverlaySettings } from '@/domain/overlay/ports'

/** Overlay settings kept in memory for Storybook and component tests, starting from the defaults unless given others. */
export function createMemoryOverlaySettings(initial: OverlaySettings = defaultOverlaySettings): StoredOverlaySettings {
  const settings = shallowRef(initial)
  return {
    settings,
    change: async (change) => {
      settings.value = { ...settings.value, ...change }
    }
  }
}
