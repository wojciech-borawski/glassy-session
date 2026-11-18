<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import NSelect from '@/ui/n-select/index.vue'
import { builtInSoundNames, type Sound } from './model/sound'
import { usePickedSounds } from './picked-sounds'
import type { AudioFileEntry } from './ports'
import { useSounds } from './sounds'

const props = defineProps<{
  label: string
  modelValue: Sound
}>()

const emit = defineEmits<{
  'update:modelValue': [sound: Sound]
}>()

const { t } = useI18n()
const { player, audioFiles, soundSettings } = useSounds()
const picks = usePickedSounds()

const files = shallowRef<readonly AudioFileEntry[] | null>(null)
const listFiles = async () => { files.value = await audioFiles.list() }
void listFiles()

const filePicker = useTemplateRef('filePicker')

/** Takes the audio file the person picked from their computer, and chooses it. A dialog keeps it only once it is saved. */
async function keepPickedFile() {
  const picked = filePicker.value?.files?.[0]
  if (picked === undefined) {
    return
  }
  const sound = await picks.pick(picked)
  await listFiles()
  emit('update:modelValue', sound)
  if (filePicker.value !== null) {
    filePicker.value.value = ''
  }
}

const BUILT_IN = 'built-in:'
const AUDIO_FILE = 'audio file:'

function valueOf(sound: Sound): string {
  return sound.kind === 'built-in' ? `${BUILT_IN}${sound.name}` : `${AUDIO_FILE}${sound.fileId}`
}

function soundOf(value: string): Sound {
  if (value.startsWith(AUDIO_FILE)) {
    return { kind: 'audio file', fileId: value.slice(AUDIO_FILE.length) }
  }
  return { kind: 'built-in', name: builtInSoundNames.find((name) => value === `${BUILT_IN}${name}`) ?? 'bell' }
}

/** Plays a picked file that is not kept yet straight from the person's computer. */
async function previewHeld(file: File, volume: number) {
  const url = URL.createObjectURL(file)
  const audio = new Audio(url)
  audio.volume = volume
  audio.addEventListener('ended', () => URL.revokeObjectURL(url))
  try {
    await audio.play()
  } catch (error) {
    URL.revokeObjectURL(url)
    console.error(error)
  }
}

async function preview() {
  const { volume } = await soundSettings.load()
  const held = picks.heldFile(props.modelValue)
  await (held === null ? player.playOnce(props.modelValue, volume) : previewHeld(held, volume))
}

/** The chosen audio file when it is not among the kept ones: gone once they are listed, and nameless until then. */
const goneFile = computed(() => {
  const chosen = props.modelValue
  if (chosen.kind !== 'audio file' || picks.heldFile(chosen) !== null || files.value?.some(({ id }) => id === chosen.fileId)) {
    return []
  }
  return [{ value: valueOf(chosen), label: files.value === null ? '' : t('soundChoice.goneFile') }]
})

const options = computed(() => [
  ...builtInSoundNames.map((name) => ({ value: valueOf({ kind: 'built-in', name }), label: t(`sound.builtIn.${name}`) })),
  ...[...files.value ?? [], ...picks.held.value].map(({ id, name }) => ({ value: valueOf({ kind: 'audio file', fileId: id }), label: name })),
  ...goneFile.value
])
</script>

<template>
  <div class="sound-choice">
    <NSelect class="sound-choice__select" :label="label" :options="options" :model-value="valueOf(modelValue)" @update:model-value="emit('update:modelValue', soundOf($event))" />
    <NButton icon="play" :label="t('soundChoice.preview', { label })" @click="preview" />
    <NButton icon="plus" :label="t('soundChoice.addFile', { label })" @click="filePicker?.click()" />
    <input
      ref="filePicker"
      class="sound-choice__file-picker"
      type="file"
      accept="audio/*"
      tabindex="-1"
      :aria-label="t('soundChoice.file', { label })"
      @change="keepPickedFile"
    >
  </div>
</template>

<style scoped>
.sound-choice {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}

.sound-choice__select {
  flex: 1;
}

.sound-choice__file-picker {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
</style>
