import type { Sound, SoundSettings } from '@/domain/sound/model/sound'
import type { SoundPlayer, SoundSettingsStore } from '@/domain/sound/ports'

/** What a ringer or a chimer needs to sound. */
export type Sounding = Readonly<{ player: SoundPlayer, soundSettings: SoundSettingsStore }>

/**
 * Starts the sound picked from the saved sound settings once, at the volume set for rings and chimes, without waiting for it to play.
 * Rings and chimes run inside a command, so a sound that is slow to start, or never does, must not hold up the commands after it.
 * A sound that cannot play goes to the console instead, so the ring or chime it belongs to still ends as given.
 */
export async function playSound({ player, soundSettings }: Sounding, soundOf: (settings: SoundSettings) => Sound): Promise<void> {
  try {
    const settings = await soundSettings.load()
    player.playOnce(soundOf(settings), settings.volume).catch((error: unknown) => console.error(error))
  } catch (error) {
    console.error(error)
  }
}
