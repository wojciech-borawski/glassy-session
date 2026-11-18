<script setup lang="ts">
import NRange from '@/ui/n-range/index.vue'
import type { SoundSettings } from './model/sound'
import SoundChoice from './sound-choice.vue'
import { useSounds } from './sounds'

const { t } = useI18n()
const { soundSettings } = useSounds()

const settings = shallowRef<SoundSettings | null>(null)
void soundSettings.load().then((loaded) => { settings.value = loaded })

function change(changes: Partial<SoundSettings>) {
  if (settings.value === null) {
    return
  }
  settings.value = { ...settings.value, ...changes }
  void soundSettings.save(settings.value)
}
</script>

<template>
  <div v-if="settings !== null" class="sound-settings">
    <SoundChoice :label="t('soundSettings.endChime')" :model-value="settings.endChime" @update:model-value="change({ endChime: $event })" />
    <SoundChoice :label="t('soundSettings.startChime')" :model-value="settings.startChime" @update:model-value="change({ startChime: $event })" />
    <NRange :label="t('soundSettings.volume')" :model-value="settings.volume" :min="0" :max="1" :step="0.05" @update:model-value="change({ volume: $event })" />
  </div>
</template>

<style scoped>
.sound-settings {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
