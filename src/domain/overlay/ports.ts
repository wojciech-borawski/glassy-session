import type { Ref } from 'vue'
import type { OverlaySettings } from './model/overlay-settings'

/** The overlay settings every page shares, and the way to change them. */
export type StoredOverlaySettings = Readonly<{
  /** The settings, kept current each time any page or the popup saves them. */
  settings: Readonly<Ref<OverlaySettings>>
  /** Saves the settings with the fields given changed and the others as they are. */
  change(change: Partial<OverlaySettings>): Promise<void>
}>
