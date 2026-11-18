import type { Refusal } from '../command/command-outcome'
import { noBackgroundSound, soundOf, type BackgroundSound } from './model/background-sound'
import type { SoundOwner } from './model/playback'
import { useStoredPlaylists } from './stored-playlists'
import { useMusicCommands } from './use-music-commands'

/**
 * The background sound being chosen in a timer or focus session dialog.
 * It starts from what the owner chose when the dialog opens, and is sent only once the owner is saved and only when it changed.
 */
export function useBackgroundSoundChoice() {
  const { playlists, backgroundSounds } = useStoredPlaylists()
  const { chooseSound } = useMusicCommands()
  const draft = ref<BackgroundSound>(noBackgroundSound)
  let chosenBefore: BackgroundSound = noBackgroundSound

  /** Starts the choice from the owner's sound, or from none for an owner not saved yet. */
  function startFrom(owner: SoundOwner | null) {
    chosenBefore = owner === null ? noBackgroundSound : soundOf(backgroundSounds.value, owner)
    draft.value = chosenBefore
  }

  /** Sends the choice for the saved owner when it differs from what the owner had. */
  async function keep(owner: SoundOwner, ownerName: string): Promise<Refusal | null> {
    if (draft.value.playlistId === chosenBefore.playlistId && draft.value.volume === chosenBefore.volume) {
      return null
    }
    return chooseSound(owner, ownerName, draft.value)
  }

  return { playlists, draft, startFrom, keep }
}
