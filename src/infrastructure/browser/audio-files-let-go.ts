import { isSound, ringSoundOf, type Sound, type SoundSettings } from '@/domain/sound/model/sound'
import { audioFileIdsLetGo } from '@/domain/sound/model/sound-use'
import { storedAlarms, storedSoundSettings, storedTimers } from './storage-items'

const ringSounds = (owners: readonly Readonly<{ ringSound?: Sound }>[] | undefined) => (owners ?? []).map(ringSoundOf)

const chimes = (settings: Partial<SoundSettings> | null) => [settings?.endChime, settings?.startChime].filter(isSound)

/**
 * Calls the listener with the ids of the audio files that a change to the stored timers, alarms or sound settings let go of:
 * those a ring sound or a chime played before the change and no longer plays after it. Whether anything else still plays them is the listener's to tell.
 */
export function watchAudioFilesLetGo(listener: (fileIds: readonly string[]) => void): () => void {
  const told = (fileIds: readonly string[]) => {
    if (fileIds.length > 0) {
      listener(fileIds)
    }
  }
  const stops = [
    storedTimers.watch((after, before) => told(audioFileIdsLetGo(ringSounds(before), ringSounds(after)))),
    storedAlarms.watch((after, before) => told(audioFileIdsLetGo(ringSounds(before?.alarms), ringSounds(after?.alarms)))),
    storedSoundSettings.watch((after, before) => told(audioFileIdsLetGo(chimes(before), chimes(after))))
  ]
  return () => stops.forEach((stop) => stop())
}
