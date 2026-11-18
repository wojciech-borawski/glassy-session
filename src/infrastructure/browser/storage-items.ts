import type { SavedAlarms } from '@/domain/alarm/ports'
import { noPlayback, type Playback, type ReportedPlace } from '@/domain/music/model/playback'
import type { SavedMusic } from '@/domain/music/ports'
import { defaultOverlaySettings, type OverlaySettings } from '@/domain/overlay/model/overlay-settings'
import type { FocusSession } from '@/domain/session/model/focus-session'
import { defaultSoundSettings, type SoundSettings } from '@/domain/sound/model/sound'
import type { Timer } from '@/domain/timer/model/timer'
import type { RepeatDayResults } from '@/domain/tracking/model/repeat-day-results'
import type { TrackedTime } from '@/domain/tracking/model/tracked-time'
import type { ThemeName, ThemeVersionChoice } from '@/ui/n-theme/themes'

export const storedTimers = storage.defineItem<readonly Timer[]>('local:timers', { fallback: [] })

export const storedTrackedTime = storage.defineItem<TrackedTime>('local:trackedTime', { fallback: {} })

export const storedRepeatDayResults = storage.defineItem<RepeatDayResults>('local:repeatDayResults', { fallback: {} })

export const storedSessions = storage.defineItem<readonly FocusSession[]>('local:focusSessions', { fallback: [] })

export type SavedThemeChoice = Readonly<{ theme: ThemeName, version: ThemeVersionChoice }>

export const storedThemeChoice = storage.defineItem<SavedThemeChoice>('local:themeChoice', { fallback: { theme: 'frost', version: 'system' } })

export const storedAlarms = storage.defineItem<SavedAlarms>('local:alarms', { fallback: { alarms: [], checkedUpTo: null } })

export const storedOverlaySettings = storage.defineItem<OverlaySettings>('local:overlaySettings', { fallback: defaultOverlaySettings })
export const storedSoundSettings = storage.defineItem<SoundSettings>('local:soundSettings', { fallback: defaultSoundSettings })

export const storedMusic = storage.defineItem<SavedMusic>('local:music', { fallback: { playlists: [], backgroundSounds: [] } })

export const storedPlayback = storage.defineItem<Playback>('local:playback', { fallback: noPlayback })

/** The last place the player reported while a sound played, kept apart from the playback so the views that watch it are not redrawn every 15 seconds. */
export const storedPlaybackPlace = storage.defineItem<ReportedPlace | null>('local:playbackPlace', { fallback: null })
