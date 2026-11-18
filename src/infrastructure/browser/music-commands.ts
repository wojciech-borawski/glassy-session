import type { Refusal } from '@/domain/command/command-outcome'
import type { MusicCommand, SoundCommand } from '@/domain/music/commands'
import { sendCommand } from './command-messages'

/** Sends a command to the background, which alone changes playlists and background sounds. Resolves once the background has applied it, with the refusal when it changed nothing. */
export function sendMusicCommand(command: MusicCommand): Promise<Refusal | null> {
  return sendCommand(command)
}

/** Sends a sound command to the background, which alone plays background sounds. Resolves once it is applied with null, or with the refusal when it could not run. */
export function sendSoundCommand(command: SoundCommand): Promise<Refusal | null> {
  return sendCommand(command)
}
