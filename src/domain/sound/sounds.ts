import { inject, provide, type InjectionKey, type Plugin } from 'vue'
import type { AudioFileStore, SoundPlayer, SoundSettingsStore } from './ports'

/** What a view needs to choose and preview sounds: the player, the person's own audio files and the sound settings. */
export type Sounds = Readonly<{ player: SoundPlayer, audioFiles: AudioFileStore, soundSettings: SoundSettingsStore }>

const soundsKey: InjectionKey<Sounds> = Symbol('sounds')

/** Gives every component below this one the sounds, from the browser or from memory. */
export function provideSounds(sounds: Sounds): void {
  provide(soundsKey, sounds)
}

/** Gives the sounds to every component of an app, for rendering one component on its own as tests do. */
export function soundsPlugin(sounds: Sounds): Plugin {
  return { install: (app) => app.provide(soundsKey, sounds) }
}

export function useSounds(): Sounds {
  const sounds = inject(soundsKey)
  if (!sounds) throw new Error('useSounds needs provideSounds in an ancestor component')
  return sounds
}
