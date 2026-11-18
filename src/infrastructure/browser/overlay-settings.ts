import { defaultOverlaySettings, type Corner, type OverlaySettings } from '@/domain/overlay/model/overlay-settings'
import type { StoredOverlaySettings } from '@/domain/overlay/ports'
import { isRecord } from '@/utils/is-record'
import { followStorage } from './followed-storage'
import { storedOverlaySettings } from './storage-items'

const CORNERS: readonly unknown[] = ['top left', 'top right', 'bottom left', 'bottom right'] satisfies Corner[]

const isCorner = (value: unknown): value is Corner => CORNERS.includes(value)

/** The saved settings, with the default standing in for each field this version does not know. */
function knownSettings(saved: unknown): OverlaySettings {
  const fields = isRecord(saved) ? saved : {}
  return {
    shownOnPages: typeof fields.shownOnPages === 'boolean' ? fields.shownOnPages : defaultOverlaySettings.shownOnPages,
    corner: isCorner(fields.corner) ? fields.corner : defaultOverlaySettings.corner,
    collapsed: typeof fields.collapsed === 'boolean' ? fields.collapsed : defaultOverlaySettings.collapsed
  }
}

export async function readOverlaySettings(): Promise<OverlaySettings> {
  return knownSettings(await storedOverlaySettings.getValue())
}

export function watchOverlaySettings(listener: (saved: OverlaySettings) => void): () => void {
  return storedOverlaySettings.watch((saved) => listener(knownSettings(saved)))
}

/** The overlay settings read from extension storage and followed through its change events, so every page and the popup share them. */
export function createBrowserOverlaySettings(): StoredOverlaySettings {
  return {
    settings: followStorage(defaultOverlaySettings, readOverlaySettings, watchOverlaySettings),
    change: async (change) => storedOverlaySettings.setValue({ ...await readOverlaySettings(), ...change })
  }
}
