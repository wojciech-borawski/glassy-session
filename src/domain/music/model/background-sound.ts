import type { Volume } from '../../sound/model/sound'
import type { SoundOwner } from './playback'

export type BackgroundSound = Readonly<{
  /** The chosen playlist, or null for none. */
  playlistId: string | null
  volume: Volume
}>

/** The background sound one timer or focus session chose. */
export type OwnedSound = Readonly<{ owner: SoundOwner, sound: BackgroundSound }>

export const noBackgroundSound: BackgroundSound = { playlistId: null, volume: 0.5 }

export function withPlaylist(sound: BackgroundSound, playlistId: string | null): BackgroundSound {
  return { ...sound, playlistId }
}

export function withVolume(sound: BackgroundSound, volume: Volume): BackgroundSound {
  if (!(volume >= 0 && volume <= 1)) {
    throw new RangeError(`A volume goes from 0 to 1, got ${volume}`)
  }
  return { ...sound, volume }
}

const isSameOwner = (one: SoundOwner, other: SoundOwner) => one.of === other.of && one.id === other.id

/** The background sound the owner chose, or none when it never chose one. */
export function soundOf(sounds: readonly OwnedSound[], owner: SoundOwner): BackgroundSound {
  return sounds.find((owned) => isSameOwner(owned.owner, owner))?.sound ?? noBackgroundSound
}

/** The owned sounds with the owner's choice in place of what it chose before. */
export function withSoundChosen(sounds: readonly OwnedSound[], owner: SoundOwner, sound: BackgroundSound): readonly OwnedSound[] {
  const chosen = { owner, sound }
  return sounds.some((owned) => isSameOwner(owned.owner, owner))
    ? sounds.map((owned) => isSameOwner(owned.owner, owner) ? chosen : owned)
    : [...sounds, chosen]
}

/** The owned sounds without the choice of an owner that is no longer stored. */
export function withoutSoundOf(sounds: readonly OwnedSound[], owner: SoundOwner): readonly OwnedSound[] {
  return sounds.filter((owned) => !isSameOwner(owned.owner, owner))
}

export function withoutRemovedPlaylist(sound: BackgroundSound, removedPlaylistId: string): BackgroundSound {
  return sound.playlistId === removedPlaylistId ? { ...sound, playlistId: null } : sound
}
