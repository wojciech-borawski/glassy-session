import { inject, provide, shallowRef, type InjectionKey, type Ref } from 'vue'
import type { Sound } from './model/sound'
import type { AudioFileEntry, AudioFileStore } from './ports'
import { useSounds } from './sounds'

/** Where a sound choice puts an audio file the person picked from their computer. */
export type PickedSounds = Readonly<{
  /** Takes the picked file and gives the sound that stands for it from then on. */
  pick(file: File): Promise<Sound>
  /** The picked files held until the dialog is saved, as a sound choice lists them. */
  held: Readonly<Ref<readonly AudioFileEntry[]>>
  /** The held file the sound stands for, or null for any other sound. */
  heldFile(sound: Sound): File | null
}>

/** The picked files of one dialog, held until it is saved. */
export type HeldPicks = PickedSounds & Readonly<{
  /** Keeps the held file the sound stands for and gives the sound of the kept file. Any other sound comes back as it is. */
  kept(sound: Sound): Promise<Sound>
  /** Lets go of every held file, as when the dialog opens again. */
  clear(): void
}>

const pickedSoundsKey: InjectionKey<PickedSounds> = Symbol('picked sounds')

const HELD = 'picked:'

/** Picked files that are held, not kept, so a dialog closed without saving, or a popup closed under it, keeps none of them. */
export function createHeldPicks(audioFiles: AudioFileStore): HeldPicks {
  const files = new Map<string, File>()
  const held = shallowRef<readonly AudioFileEntry[]>([])
  const heldFile = (sound: Sound) => sound.kind === 'audio file' ? files.get(sound.fileId) ?? null : null
  return {
    held,
    heldFile,
    async pick(file) {
      const id = `${HELD}${files.size + 1}`
      files.set(id, file)
      held.value = [...held.value, { id, name: file.name, type: file.type }]
      return { kind: 'audio file', fileId: id }
    },
    async kept(sound) {
      const file = heldFile(sound)
      if (file === null) {
        return sound
      }
      return { kind: 'audio file', fileId: await audioFiles.save({ name: file.name, type: file.type, bytes: await file.arrayBuffer() }) }
    },
    clear() {
      files.clear()
      held.value = []
    }
  }
}

/** Has every sound choice in this dialog hold the files picked in it until the dialog keeps them as it saves. */
export function holdPickedSounds(): HeldPicks {
  const picks = createHeldPicks(useSounds().audioFiles)
  provide(pickedSoundsKey, picks)
  return picks
}

/** The picked files of the dialog this sound choice is in, or, outside a dialog, a place that keeps each picked file at once. */
export function usePickedSounds(): PickedSounds {
  const { audioFiles } = useSounds()
  return inject(pickedSoundsKey, () => ({
    held: shallowRef([]),
    heldFile: () => null,
    async pick(file) {
      return { kind: 'audio file', fileId: await audioFiles.save({ name: file.name, type: file.type, bytes: await file.arrayBuffer() }) }
    }
  }), true)
}
