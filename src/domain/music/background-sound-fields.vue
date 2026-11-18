<script setup lang="ts">
import NFieldset from '@/ui/n-fieldset/index.vue'
import NRange from '@/ui/n-range/index.vue'
import NSelect from '@/ui/n-select/index.vue'
import { withPlaylist, withVolume, type BackgroundSound } from './model/background-sound'
import type { Playlist } from './model/playlist'

const props = defineProps<{
  playlists: readonly Playlist[]
  modelValue: BackgroundSound
}>()

const emit = defineEmits<{
  'update:modelValue': [sound: BackgroundSound]
}>()

const { t } = useI18n()

/** The select's value for none, which no playlist id can be. */
const NONE = ''

const options = computed(() => [
  { value: NONE, label: t('backgroundSound.none') },
  ...props.playlists.map(({ id, name }) => ({ value: id, label: name }))
])

const percent = computed(() => Math.round(props.modelValue.volume * 100))

function choosePlaylist(value: string) {
  emit('update:modelValue', withPlaylist(props.modelValue, value === NONE ? null : value))
}

function chooseVolume(value: number) {
  emit('update:modelValue', withVolume(props.modelValue, value / 100))
}
</script>

<template>
  <NFieldset :legend="t('backgroundSound.legend')">
    <div class="background-sound">
      <div class="background-sound__fields">
        <NSelect :model-value="modelValue.playlistId ?? NONE" :label="t('backgroundSound.playlist')" :options="options" @update:model-value="choosePlaylist" />
        <div class="background-sound__volume">
          <NRange :model-value="percent" :label="t('backgroundSound.volume')" :min="0" :max="100" :step="5" @update:model-value="chooseVolume" />
          <span class="background-sound__percent">{{ t('backgroundSound.percent', { percent }) }}</span>
        </div>
      </div>
      <p v-if="playlists.length === 0" class="background-sound__hint">{{ t('backgroundSound.noPlaylists') }}</p>
    </div>
  </NFieldset>
</template>

<style scoped>
.background-sound {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.background-sound__fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
  gap: 8px;
}

.background-sound__volume {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}

.background-sound__volume > :first-child {
  flex: 1;
  min-width: 0;
}

/* As tall as the playlist select beside it, so the slider sits level with it. */
.background-sound__volume :deep(.n-range) {
  height: 32px;
}

.background-sound__percent {
  min-width: 32px;
  color: var(--n-text);
  line-height: 32px;
  font-variant-numeric: tabular-nums;
  text-align: end;
}

.background-sound__hint {
  margin: 0;
}
</style>
