import type { Ending } from '@/domain/session/model/focus-session'
import type { Chimer } from '@/domain/session/ports'
import type { SoundSettings } from '@/domain/sound/model/sound'
import type { NotificationKey } from './notification-texts'
import { notify } from './notify'
import { playSound, type Sounding } from './play-sound'

const MESSAGE_KEYS: Readonly<Record<Ending, NotificationKey>> = {
  'focus step': 'chime.focusStepEnded',
  'break': 'chime.breakEnded',
  'session': 'chime.sessionEnded'
}

/** A break that ends plays the start chime, and a focus step or the whole session that ends plays the end chime. */
function chimeFor(ending: Ending, { endChime, startChime }: SoundSettings) {
  return ending === 'break' ? startChime : endChime
}

/** Chimes with a system notification, one per session so a later chime replaces the one before, and the chime chosen in settings. */
export function createBrowserChimer(sounding: Sounding): Chimer {
  return {
    async chime(session, ending) {
      await notify(`chime:${session.id}`, session.name, MESSAGE_KEYS[ending])
      await playSound(sounding, (settings) => chimeFor(ending, settings))
    }
  }
}
