import { useSnackbar } from '@/ui/n-snackbar/snackbar'
import type { Volume } from '../sound/model/sound'
import type { Refusal } from '../command/command-outcome'
import { whyRefused } from '../command/why-refused'
import type { SoundCommand } from './commands'
import { soundOf, withVolume } from './model/background-sound'
import type { SoundOwner } from './model/playback'
import { useStoredHeardSound } from './stored-heard-sound'
import { useStoredPlaylists } from './stored-playlists'

/** Says in the snackbar why a command of the sound controls did nothing, and nothing when it worked, since the person hears it. */
function useToldRefusal() {
  const { show } = useSnackbar()
  const { t } = useI18n()
  return (refusal: Refusal | null): Refusal | null => {
    if (refusal !== null) {
      show(whyRefused(refusal, t))
    }
    return refusal
  }
}

/** Sends the sound commands of the sound controls, which pause, resume or skip the heard sound. Needs only the stored heard sound. */
export function useSoundCommands() {
  const { sendSound } = useStoredHeardSound()
  const told = useToldRefusal()
  return {
    run: async (command: SoundCommand) => told(await sendSound(command))
  }
}

/**
 * Sets the volume of an owner's background sound from the sound controls, through the stored playlists.
 * A volume chosen while the one before is still being saved waits for it, and only the last volume chosen meanwhile is sent.
 */
export function useSoundVolume() {
  const { backgroundSounds, send } = useStoredPlaylists()
  const told = useToldRefusal()

  let saving: Promise<unknown> | null = null
  let waiting: Readonly<{ owner: SoundOwner, volume: Volume }> | null = null

  async function savingVolume(owner: SoundOwner, volume: Volume): Promise<void> {
    const sound = withVolume(soundOf(backgroundSounds.value, owner), volume)
    told(await send({ type: 'chooseBackgroundSound', owner, sound }))
  }

  async function setVolume(owner: SoundOwner, volume: Volume): Promise<void> {
    waiting = { owner, volume }
    if (saving !== null) {
      return
    }
    while (waiting !== null) {
      const next = waiting
      waiting = null
      saving = savingVolume(next.owner, next.volume)
      await saving
    }
    saving = null
  }

  return { setVolume }
}
