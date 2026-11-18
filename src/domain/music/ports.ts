import type { Ref } from 'vue'
import type { Refusal } from '../command/command-outcome'
import type { MusicCommand, SoundCommand } from './commands'
import type { OwnedSound } from './model/background-sound'
import type { Playback, ReportedPlace } from './model/playback'
import type { AudioFile, Playlist } from './model/playlist'

/** The stored playlists, and the background sound each timer and focus session chose. */
export type SavedMusic = Readonly<{ playlists: readonly Playlist[], backgroundSounds: readonly OwnedSound[] }>

export type MusicStore = Readonly<{
  /** Gives the stored playlists in the order they were added, or none when nothing is stored yet. */
  load(): Promise<SavedMusic>
  save(saved: SavedMusic): Promise<void>
}>

/** Where the background sounds are in their playing, kept so a background that stops and starts again carries on from it. */
export type PlaybackStore = Readonly<{
  /** Gives the stored playback, or no playback when nothing is stored yet, with the last place reported since it was saved. */
  load(): Promise<Playback>
  /** Stores the playback, which replaces any place reported before. */
  save(playback: Playback): Promise<void>
  /** Stores a place the player reported apart from the playback, so the contexts that follow the playback are not told of it every 15 seconds. */
  savePlace(place: ReportedPlace): Promise<void>
}>

/**
 * What a context other than the background reads of the music to follow the heard sound, and the sound commands it sends.
 * It changes no music and reaches no audio file, so the overlay on a web page takes only this.
 */
export type StoredHeardSound = Readonly<{
  /** The stored playlists, kept current each time they are saved. */
  playlists: Readonly<Ref<readonly Playlist[]>>
  /** The background sound each timer and focus session chose, kept current the same way. */
  backgroundSounds: Readonly<Ref<readonly OwnedSound[]>>
  /** Where the background sounds are in their playing, kept current each time the background saves it. */
  playback: Readonly<Ref<Playback>>
  /** Sends a sound command, which pauses, resumes or skips the heard sound. Resolves once it is applied with null, or with the refusal that says why it changed nothing. It never rejects. */
  sendSound(command: SoundCommand): Promise<Refusal | null>
}>

/** The stored playlists and background sounds as a context other than the background sees them, and the way it asks the background to change them. */
export type StoredPlaylists = StoredHeardSound & Readonly<{
  /** Sends a music command. Resolves the way `sendSound` does. */
  send(command: MusicCommand): Promise<Refusal | null>
  /** Keeps the bytes of a file the person picked, so a command can add it to a playlist. Resolves with null when it cannot be read as audio. */
  keepFile(file: File): Promise<AudioFile | null>
}>
