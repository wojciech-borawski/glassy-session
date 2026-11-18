import type { Duration } from '@/utils/time/units'
import type { Volume } from '../../sound/model/sound'
import type { BackgroundSound } from './background-sound'
import { currentFileAfterChange, nextFile, previousFile, type AudioFile, type Playlist } from './playlist'

/** The timer or focus session a background sound belongs to. */
export type SoundOwner = Readonly<{ of: 'timer' | 'focus session', id: string }>

/** What the player is told to play: one file of an owner's playlist, from a place in it, at a volume. */
export type Cue = Readonly<{
  owner: SoundOwner
  playlistId: string
  fileId: string
  from: Duration
  volume: Volume
}>

/** How far into one file of a playlist an owner's sound got when it last paused, or where it is set to start. */
export type Place = Readonly<{ playlistId: string, fileId: string, at: Duration }>

type OwnerPlayback = Readonly<{ owner: SoundOwner, running: boolean, place: Place | null }>

export type Playback = Readonly<{
  /** The owners whose sound may be heard, the most recently started or resumed first. */
  owners: readonly OwnerPlayback[]
  /** Whether the person paused the background sound on its own. */
  soundPaused: boolean
  /** What the player was last told to play, or null when it was told to pause or stop. */
  playing: Cue | null
  /**
   * The files of the heard sound's playlist that could not play one after the other, since a file last played to its end or the sound
   * was last asked for again. Once no file of the playlist can play, the sound is paused as if the person paused it. Left out when none.
   */
  unplayable?: readonly string[]
}>

export const noPlayback: Playback = { owners: [], soundPaused: false, playing: null }

/** How far into the file of a cue the player got while the cue played, as it reports every 15 seconds. */
export type ReportedPlace = Readonly<{ cue: Cue, at: Duration }>

export type SoundLibrary = Readonly<{
  soundOf: (owner: SoundOwner) => BackgroundSound
  playlists: readonly Playlist[]
}>

export type PlaybackEvent =
  | Readonly<{ type: 'owner started' | 'owner paused' | 'owner resumed', owner: SoundOwner }>
  /** The owner's background sound got another playlist or volume. */
  | Readonly<{ type: 'sound changed', owner: SoundOwner }>
  /** A playlist got files added, removed or moved. The library holds it as it is now. */
  | Readonly<{ type: 'playlist changed', before: Playlist }>
  /** The owner finished, was reset, ended early or was removed, so its place is forgotten. */
  | Readonly<{ type: 'owner finished', owner: SoundOwner }>
  /** The player reports where it paused a cue, after it was told to pause or to play another cue. */
  | Readonly<{ type: 'player paused', cue: Cue, at: Duration }>
  /** The player reports how far into the file of the cue playing it got, as it does every 15 seconds while it plays. */
  | Readonly<{ type: 'place reported', cue: Cue, at: Duration }>
  /** The player reports that the file of a cue played to its end. */
  | Readonly<{ type: 'file ended', cue: Cue }>
  /** The player reports that the file of a cue cannot play, as one that is no longer kept or is no audio. */
  | Readonly<{ type: 'file cannot play', cue: Cue }>
  /** The person goes to the next or the previous file of the heard sound. */
  | Readonly<{ type: 'next file' | 'previous file' }>
  /** The person pauses the heard sound while its owner keeps running, or resumes it. */
  | Readonly<{ type: 'sound paused' | 'sound resumed' }>
  /** A break or a focus step of a running focus session started. */
  | Readonly<{ type: 'break started' | 'focus step started' }>

/** What a timer or focus session did that the background sound follows. */
export type OwnerEvent = Extract<PlaybackEvent, { type: 'owner started' | 'owner paused' | 'owner resumed' | 'owner finished' | 'break started' | 'focus step started' }>

export type PlayerInstruction =
  | Readonly<{ do: 'play', cue: Cue }>
  | Readonly<{ do: 'pause' }>
  | Readonly<{ do: 'stop' }>
  | Readonly<{ do: 'set volume', volume: Volume }>
  | Readonly<{ do: 'nothing' }>

type Change = Readonly<{ playback: Playback, instruction: PlayerInstruction }>

type FileFrom = (playlist: Playlist, fileId: string) => AudioFile | null

export function isSameOwner(one: SoundOwner, other: SoundOwner): boolean {
  return one.of === other.of && one.id === other.id
}

function isSameFile(cue: Cue, other: Cue): boolean {
  return isSameOwner(cue.owner, other.owner) && cue.playlistId === other.playlistId && cue.fileId === other.fileId
}

function isPlaceOf(place: Place | null, cue: Cue): boolean {
  return place?.playlistId === cue.playlistId && place.fileId === cue.fileId
}

function playlistOf(library: SoundLibrary, playlistId: string | null): Playlist | undefined {
  return library.playlists.find(({ id }) => id === playlistId)
}

function changingOwner(owners: readonly OwnerPlayback[], owner: SoundOwner, change: (entry: OwnerPlayback) => OwnerPlayback): readonly OwnerPlayback[] {
  return owners.map((entry) => isSameOwner(entry.owner, owner) ? change(entry) : entry)
}

function inFront(owners: readonly OwnerPlayback[], entry: OwnerPlayback): readonly OwnerPlayback[] {
  return [entry, ...owners.filter(({ owner }) => !isSameOwner(owner, entry.owner))]
}

function withoutOwner(owners: readonly OwnerPlayback[], owner: SoundOwner): readonly OwnerPlayback[] {
  return owners.filter((entry) => !isSameOwner(entry.owner, owner))
}

/** Sets how far into the cue's file its owner got, when the owner's place is still in that file. */
function placedAt(owners: readonly OwnerPlayback[], cue: Cue, at: Duration): readonly OwnerPlayback[] {
  return changingOwner(owners, cue.owner, (entry) => isPlaceOf(entry.place, cue) ? { ...entry, place: { playlistId: cue.playlistId, fileId: cue.fileId, at } } : entry)
}

/** Sets the cue's owner to the beginning of another file of the cue's playlist. */
function movedOn(owners: readonly OwnerPlayback[], cue: Cue, fileFrom: FileFrom, library: SoundLibrary): readonly OwnerPlayback[] {
  const playlist = playlistOf(library, cue.playlistId)
  const file = playlist === undefined ? null : fileFrom(playlist, cue.fileId)
  const place = file === null ? null : { playlistId: cue.playlistId, fileId: file.id, at: 0 }
  return changingOwner(owners, cue.owner, (entry) => ({ ...entry, place }))
}

/** The sound of the most recently started or resumed owner that is running and has a playlist with files. */
function heardCue(owners: readonly OwnerPlayback[], library: SoundLibrary): Cue | null {
  for (const { owner, running, place } of owners) {
    const { playlistId, volume } = library.soundOf(owner)
    const first = playlistOf(library, playlistId)?.files[0]
    if (running && playlistId !== null && first !== undefined) {
      return { owner, playlistId, fileId: place?.fileId ?? first.id, from: place?.at ?? 0, volume }
    }
  }
  return null
}

function noFileOfCanPlay(playlist: Playlist | undefined, unplayable: readonly string[]): boolean {
  return playlist?.files.every(({ id }) => unplayable.includes(id)) ?? true
}

/** Whether the heard sound is paused because no file of its playlist could play, one after the other. */
export function noFileCanPlay(playback: Playback, library: SoundLibrary): boolean {
  const heard = heardCue(playback.owners, library)
  return heard !== null && playback.soundPaused && noFileOfCanPlay(playlistOf(library, heard.playlistId), playback.unplayable ?? [])
}

/** The owner whose background sound is heard, also while the person paused it, or null when no running owner has a playlist with files. Its sound controls show. */
export function heardOwner(playback: Playback, library: SoundLibrary): SoundOwner | null {
  return heardCue(playback.owners, library)?.owner ?? null
}

function instructionFor(owners: readonly OwnerPlayback[], playing: Cue | null, heard: Cue | null): PlayerInstruction {
  if (heard === null) {
    if (playing === null) {
      return { do: 'nothing' }
    }
    const placeKept = owners.some(({ owner, place }) => isSameOwner(owner, playing.owner) && isPlaceOf(place, playing))
    return placeKept ? { do: 'pause' } : { do: 'stop' }
  }
  if (playing === null || !isSameFile(playing, heard) || playing.from !== heard.from) {
    return { do: 'play', cue: heard }
  }
  return playing.volume === heard.volume ? { do: 'nothing' } : { do: 'set volume', volume: heard.volume }
}

/**
 * Works out what should be heard now and tells the player what it takes to get there from what it was last told.
 * `playing` is null when the player plays nothing, as after a file ended, or when the heard file has to start anew.
 */
function reconciled(owners: readonly OwnerPlayback[], soundPaused: boolean, playing: Cue | null, library: SoundLibrary): Change {
  const heard = soundPaused ? null : heardCue(owners, library)
  const ownersWithHeardPlace = heard === null
    ? owners
    : changingOwner(owners, heard.owner, (entry) => ({ ...entry, place: { playlistId: heard.playlistId, fileId: heard.fileId, at: heard.from } }))
  const audible = heard?.volume === 0 ? null : heard
  return { playback: { owners: ownersWithHeardPlace, soundPaused, playing: audible }, instruction: instructionFor(owners, playing, audible) }
}

function placeAfterChange(place: Place, before: Playlist, after: Playlist): Place | null {
  const file = currentFileAfterChange(before, after, place.fileId)
  if (file === null) {
    return null
  }
  return file.id === place.fileId ? place : { ...place, fileId: file.id, at: 0 }
}

/** The events after which the files that cannot play are counted from none: a file played to its end, or the person or an owner asked for the sound again. */
const COUNTS_ANEW: ReadonlySet<PlaybackEvent['type']> = new Set<PlaybackEvent['type']>([
  'file ended', 'owner started', 'owner resumed', 'sound resumed', 'next file', 'previous file', 'break started', 'focus step started', 'sound changed', 'playlist changed'
])

/**
 * The playback after an event and what the player has to do for it.
 * The owners, the person and the player send events; the player gets back at most one instruction per event.
 * The player's reports are applied before the next event, so a report always describes what the player was last told.
 */
export function playbackAfter(playback: Playback, event: PlaybackEvent, library: SoundLibrary): Change {
  const counted = withUnplayable(playback, COUNTS_ANEW.has(event.type) ? [] : playback.unplayable ?? [])
  const change = changeAfter(counted, event, library)
  const unplayable = change.playback.unplayable ?? counted.unplayable ?? []
  return { ...change, playback: withUnplayable(change.playback, unplayable) }
}

function withUnplayable({ owners, soundPaused, playing }: Playback, unplayable: readonly string[]): Playback {
  return unplayable.length === 0 ? { owners, soundPaused, playing } : { owners, soundPaused, playing, unplayable }
}

function changeAfter(playback: Playback, event: PlaybackEvent, library: SoundLibrary): Change {
  const { owners, soundPaused, playing } = playback
  const unchanged: Change = { playback, instruction: { do: 'nothing' } }
  switch (event.type) {
  case 'owner started':
    return reconciled(inFront(owners, { owner: event.owner, running: true, place: null }), false, playing, library)
  case 'owner resumed': {
    const place = owners.find(({ owner }) => isSameOwner(owner, event.owner))?.place ?? null
    return reconciled(inFront(owners, { owner: event.owner, running: true, place }), soundPaused, playing, library)
  }
  case 'owner paused':
    return reconciled(changingOwner(owners, event.owner, (entry) => ({ ...entry, running: false })), soundPaused, playing, library)
  case 'owner finished':
    return reconciled(withoutOwner(owners, event.owner), soundPaused, playing, library)
  case 'sound changed': {
    const { playlistId } = library.soundOf(event.owner)
    const changed = changingOwner(owners, event.owner, (entry) => entry.place?.playlistId === playlistId ? entry : { ...entry, place: null })
    return reconciled(changed, soundPaused, playing, library)
  }
  case 'playlist changed': {
    const { before } = event
    const after = playlistOf(library, before.id) ?? { ...before, files: [] }
    const changed = owners.map((entry) => entry.place?.playlistId === before.id ? { ...entry, place: placeAfterChange(entry.place, before, after) } : entry)
    return reconciled(changed, soundPaused, playing, library)
  }
  case 'sound paused':
    return reconciled(owners, heardCue(owners, library) !== null, playing, library)
  case 'sound resumed':
  case 'break started':
  case 'focus step started':
    return reconciled(owners, false, playing, library)
  case 'next file':
  case 'previous file': {
    const heard = heardCue(owners, library)
    if (heard === null) {
      return unchanged
    }
    return reconciled(movedOn(owners, heard, event.type === 'next file' ? nextFile : previousFile, library), soundPaused, null, library)
  }
  case 'file ended':
    if (playing === null || !isSameFile(playing, event.cue)) {
      return unchanged
    }
    return reconciled(movedOn(owners, event.cue, nextFile, library), soundPaused, null, library)
  case 'file cannot play': {
    if (playing === null || !isSameFile(playing, event.cue)) {
      return unchanged
    }
    const unplayable = [...playback.unplayable ?? [], event.cue.fileId]
    const change = noFileOfCanPlay(playlistOf(library, event.cue.playlistId), unplayable)
      ? reconciled(owners, true, playing, library)
      : reconciled(movedOn(owners, event.cue, nextFile, library), soundPaused, null, library)
    return { ...change, playback: { ...change.playback, unplayable } }
  }
  case 'player paused':
    return { playback: { ...playback, owners: placedAt(owners, event.cue, event.at) }, instruction: { do: 'nothing' } }
  case 'place reported':
    return { playback: withPlaceReported(playback, event), instruction: { do: 'nothing' } }
  }
}

/** Keeps a place the player reported as where the cue playing and its owner are, so it plays on from there. A place in a file that no longer plays changes nothing. */
export function withPlaceReported(playback: Playback, { cue, at }: ReportedPlace): Playback {
  const { owners, playing } = playback
  if (playing === null || !isSameFile(playing, cue)) {
    return playback
  }
  return { ...playback, owners: placedAt(owners, cue, at), playing: { ...playing, from: at } }
}
