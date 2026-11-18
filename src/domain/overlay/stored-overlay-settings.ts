import { inject, provide, type InjectionKey } from 'vue'
import type { StoredOverlaySettings } from './ports'

const storedOverlaySettingsKey: InjectionKey<StoredOverlaySettings> = Symbol('stored overlay settings')

/** Gives every component below this one the overlay settings, from the browser or from memory. */
export function provideStoredOverlaySettings(storedOverlaySettings: StoredOverlaySettings): void {
  provide(storedOverlaySettingsKey, storedOverlaySettings)
}

export function useStoredOverlaySettings(): StoredOverlaySettings {
  const storedOverlaySettings = inject(storedOverlaySettingsKey)
  if (!storedOverlaySettings) throw new Error('useStoredOverlaySettings needs provideStoredOverlaySettings in an ancestor component')
  return storedOverlaySettings
}
