import { themeNames, type ThemeName, type ThemeVersionChoice } from '@/ui/n-theme/themes'
import { storedThemeChoice, type SavedThemeChoice } from './storage-items'

const VERSION_CHOICES: readonly unknown[] = ['system', 'light', 'dark'] satisfies ThemeVersionChoice[]

const isThemeName = (value: unknown): value is ThemeName => (themeNames as readonly unknown[]).includes(value)
const isVersionChoice = (value: unknown): value is ThemeVersionChoice => VERSION_CHOICES.includes(value)

/** The theme and version the person chose last. Frost and matching the system stand in for a choice never made or one this version does not have. */
export async function readThemeChoice(): Promise<SavedThemeChoice> {
  return knownChoice(await storedThemeChoice.getValue())
}

function knownChoice(saved: Partial<Record<keyof SavedThemeChoice, unknown>> | null): SavedThemeChoice {
  return {
    theme: isThemeName(saved?.theme) ? saved.theme : 'frost',
    version: isVersionChoice(saved?.version) ? saved.version : 'system'
  }
}

export function saveThemeChoice(choice: SavedThemeChoice): Promise<void> {
  return storedThemeChoice.setValue(choice)
}

/** Tells each theme choice saved from now on, with the same fallback as reading it. Returns the way to stop. */
export function watchThemeChoice(listener: (choice: SavedThemeChoice) => void): () => void {
  return storedThemeChoice.watch((saved) => listener(knownChoice(saved)))
}
