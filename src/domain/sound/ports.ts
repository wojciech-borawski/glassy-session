import type { Duration } from '@/utils/time/units'
import type { Sound, SoundSettings, Volume } from './model/sound'

/**
 * Plays every sound the extension makes. One adapter per browser, because a Chromium service worker cannot play audio itself.
 * Besides sounds played once, it plays one of the person's own audio files at a time on its own, such as a background sound, and rings and chimes play over it.
 */
export type SoundPlayer = Readonly<{
  /** Plays the sound once from its start at the volume, over anything already playing. Resolves once it has started. */
  playOnce(sound: Sound, volume: Volume): Promise<void>
  /** Plays the audio file from the place in it, at the volume, in place of the file it played before. Resolves once it has started. */
  playFile(fileId: string, from: Duration, volume: Volume): Promise<void>
  /** Pauses the file playing and lets go of it. Resolves with how far into the file it got, or null when no file was playing. */
  pauseFile(): Promise<Duration | null>
  /** Stops the file playing and lets go of it. */
  stopFile(): Promise<void>
  /** Changes how loud the file playing plays. */
  setFileVolume(volume: Volume): Promise<void>
  /** Gives the id of the file it was last told to play, unless it was told to pause or stop since, or null. A file that played to its end still counts, since its end is reported. */
  fileCued(): Promise<string | null>
  /** Calls the listener with the id of each file that plays to its end. */
  onFileEnded(listener: (fileId: string) => void): void
  /** Calls the listener with the id of each file it was told to play that cannot play, as one no longer kept or one that is no audio, each time. */
  onFileCannotPlay(listener: (fileId: string) => void): void
  /** Calls the listener every 15 seconds while a file plays, with the file's id and how far into it it got, as the player tells it. */
  onFilePlace(listener: (fileId: string, at: Duration) => void): void
}>

/** One of the person's own audio files as it is kept: its file name, its media type and its content. */
export type AudioFileData = Readonly<{ name: string, type: string, bytes: ArrayBuffer }>

/** A kept audio file as a list shows it, without its content. */
export type AudioFileEntry = Readonly<{ id: string, name: string, type: string }>

/** Keeps each of the person's own audio files once, for every place that plays it. */
export type AudioFileStore = Readonly<{
  /** Keeps the file and gives the id it is known by from then on. */
  save(file: AudioFileData): Promise<string>
  /** Gives the kept file, or null when no file has the id. */
  read(fileId: string): Promise<AudioFileData | null>
  /** Removes the file. Removing a file that is not kept changes nothing. */
  remove(fileId: string): Promise<void>
  /** Gives the kept files in the order they were saved. */
  list(): Promise<readonly AudioFileEntry[]>
}>

/** The sound settings, which the popup saves and the background reads each time it rings or chimes. */
export type SoundSettingsStore = Readonly<{
  /** Gives the saved settings, with the default for any that were never saved. */
  load(): Promise<SoundSettings>
  save(settings: SoundSettings): Promise<void>
}>
