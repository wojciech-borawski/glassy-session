import { ringSoundOf } from '@/domain/sound/model/sound'
import type { Ringer } from '@/domain/timer/ports'
import { notify } from './notify'
import { playSound, type Sounding } from './play-sound'

/** Rings with a system notification and the timer's ring sound. */
export function createBrowserRinger(sounding: Sounding): Ringer {
  return {
    async ring(timer) {
      await notify(`ring:${timer.id}`, timer.name, 'ring.finished')
      await playSound(sounding, () => ringSoundOf(timer))
    }
  }
}
