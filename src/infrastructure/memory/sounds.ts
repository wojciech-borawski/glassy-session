import type { SoundSettings } from '@/domain/sound/model/sound'
import type { Sounds } from '@/domain/sound/sounds'
import { createMemoryAudioFileStore } from './audio-file-store'
import { createMemorySoundPlayer } from './sound-player'
import { createMemorySoundSettingsStore } from './sound-settings-store'

/** Sounds over in-memory adapters, for Storybook and component tests. The player records what it was asked to play. */
export function createMemorySounds(settings?: SoundSettings): Sounds & { player: ReturnType<typeof createMemorySoundPlayer> } {
  return { player: createMemorySoundPlayer(), audioFiles: createMemoryAudioFileStore(), soundSettings: createMemorySoundSettingsStore(settings) }
}
