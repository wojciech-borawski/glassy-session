<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import type { AudioFileEntry } from '../sound/ports'
import { useSounds } from '../sound/sounds'
import { useMusicCommands } from './use-music-commands'

const { t } = useI18n()
const { audioFiles } = useSounds()
const { removeAudioFile } = useMusicCommands()

const files = shallowRef<readonly AudioFileEntry[] | null>(null)
const listFiles = async () => { files.value = await audioFiles.list() }
void listFiles()

/** Asks the background to forget the file, which it refuses while a ring sound, a chime or a playlist still plays it, and lists the files again. */
async function remove(file: AudioFileEntry) {
  await removeAudioFile(file)
  await listFiles()
}
</script>

<template>
  <div class="own-audio-files">
    <h3 class="own-audio-files__heading">{{ t('ownAudioFiles.heading') }}</h3>
    <p v-if="files?.length === 0" class="own-audio-files__empty">{{ t('ownAudioFiles.empty') }}</p>
    <ul v-else-if="files !== null" class="own-audio-files__list" :aria-label="t('ownAudioFiles.heading')">
      <li v-for="file in files" :key="file.id" class="own-audio-files__file">
        <span class="own-audio-files__name">{{ file.name }}</span>
        <NButton icon="close" :label="t('ownAudioFiles.delete', { file: file.name })" @click="remove(file)" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.own-audio-files {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.own-audio-files__heading {
  margin: 0;
  font-size: 12.5px;
  font-weight: var(--n-font-weight-strong);
}

.own-audio-files__empty {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 11.5px;
}

.own-audio-files__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.own-audio-files__file {
  display: flex;
  align-items: center;
  gap: 6px;
}

.own-audio-files__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
