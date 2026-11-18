<script setup lang="ts">
import NRange from '@/ui/n-range/index.vue'
import { soundOf } from './model/background-sound'
import type { SoundOwner } from './model/playback'
import { useStoredPlaylists } from './stored-playlists'
import { useSoundVolume } from './use-sound-commands'

const props = defineProps<{
  owner: SoundOwner
  /** The name of the timer or focus session, which the label names. */
  name: string
}>()

const { t } = useI18n()
const { backgroundSounds } = useStoredPlaylists()
const { setVolume } = useSoundVolume()

/** The volume as the person last moved it, shown until the stored one catches up. */
const draft = ref<number | null>(null)
const percent = computed(() => draft.value ?? Math.round(soundOf(backgroundSounds.value, props.owner).volume * 100))

function changeVolume(value: number): void {
  draft.value = value
  void setVolume(props.owner, value / 100)
}

watch(() => soundOf(backgroundSounds.value, props.owner).volume, (volume) => {
  if (draft.value !== null && Math.round(volume * 100) === draft.value) {
    draft.value = null
  }
})
</script>

<template>
  <NRange
    class="sound-volume"
    :label="t('soundControls.volume', { name })"
    hide-label
    :model-value="percent"
    :min="0"
    :max="100"
    :step="5"
    @update:model-value="changeVolume"
  />
</template>

<style scoped>
.sound-volume {
  width: 64px;
  margin-left: 4px;
}
</style>
