<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import NCard from '@/ui/n-card/index.vue'
import NTextField from '@/ui/n-text-field/index.vue'
import { formatCountdown } from '@/utils/time/format-duration'
import type { AudioFile, Playlist } from './model/playlist'

const props = defineProps<{
  playlist: Playlist
  /** The names of the timers and focus sessions whose background sound is this playlist. */
  usedBy: readonly string[]
}>()

const emit = defineEmits<{
  rename: [name: string]
  remove: []
  removeFile: [file: AudioFile]
  moveFile: [from: number, to: number]
  addFiles: [files: readonly File[]]
}>()

const { t } = useI18n()

const typedName = ref(props.playlist.name)

watch(() => props.playlist.name, (name) => {
  typedName.value = name
})

type MoveButton = 'earlier' | 'later'

const list = useTemplateRef('list')

/** The file a button moved, and that button, so focus can follow the file to its new place once the playlist has changed. */
let moved: Readonly<{ fileId: string, button: MoveButton }> | null = null

function move(file: AudioFile, from: number, to: number, button: MoveButton) {
  moved = { fileId: file.id, button }
  emit('moveFile', from, to)
}

watch(() => props.playlist.files, () => {
  if (moved === null) {
    return
  }
  const row = list.value?.querySelector(`[data-file="${CSS.escape(moved.fileId)}"]`)
  const buttons = Array.from(row?.querySelectorAll<HTMLButtonElement>('button[data-button]') ?? [])
  const same = buttons.find((button) => button.dataset.button === moved?.button && !button.disabled)
  ;(same ?? buttons.find((button) => !button.disabled))?.focus()
  moved = null
}, { flush: 'post' })

const chooser = useTemplateRef('chooser')

function choose() {
  const files = Array.from(chooser.value?.files ?? [])
  if (chooser.value) {
    chooser.value.value = ''
  }
  emit('addFiles', files)
}

/** The id of the file being dragged, while a drag is on. */
const dragged = ref<string | null>(null)

function startDrag(event: DragEvent, file: AudioFile) {
  dragged.value = file.id
  event.dataTransfer?.setData('text/plain', file.name)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function allowDrop(event: DragEvent) {
  if (dragged.value !== null) {
    event.preventDefault()
  }
}

function drop(event: DragEvent, onto: number) {
  if (dragged.value === null) {
    return
  }
  const from = props.playlist.files.findIndex(({ id }) => id === dragged.value)
  dragged.value = null
  event.preventDefault()
  if (from !== -1 && from !== onto) {
    emit('moveFile', from, onto)
  }
}

/** The name last sent, so confirming it and then leaving the field sends it once. */
let sentName: string | null = null

function rename() {
  const name = typedName.value.trim()
  if (name === '') {
    typedName.value = props.playlist.name
    return
  }
  if (name === props.playlist.name || name === sentName) {
    return
  }
  sentName = name
  emit('rename', name)
}
</script>

<template>
  <NCard as="article" class="playlist-card" :aria-label="playlist.name">
    <template #header>
      <form class="playlist-card__rename" @submit.prevent="rename" @focusout="rename" @keydown.esc="typedName = playlist.name">
        <NTextField v-model="typedName" :label="t('playlistCard.name', { name: playlist.name })" hide-label />
      </form>
      <NButton icon="close" :label="t('playlistCard.delete', { name: playlist.name })" @click="emit('remove')" />
    </template>
    <p v-if="playlist.files.length === 0" class="playlist-card__hint">{{ t('playlistCard.noFiles') }}</p>
    <ol v-else ref="list" class="playlist-card__files" :aria-label="t('playlistCard.files', { name: playlist.name })">
      <li
        v-for="(file, index) in playlist.files"
        :key="file.id"
        class="playlist-card__file"
        :data-file="file.id"
        draggable="true"
        @dragstart="startDrag($event, file)"
        @dragover="allowDrop"
        @drop="drop($event, index)"
        @dragend="dragged = null"
      >
        <span class="playlist-card__number">{{ index + 1 }}</span>
        <b class="playlist-card__name">{{ file.name }}</b>
        <span v-if="file.length !== undefined" class="playlist-card__length">{{ formatCountdown(file.length) }}</span>
        <NButton class="playlist-card__button" data-button="earlier" icon="chevron-up" :disabled="index === 0" :label="t('playlistCard.earlier', { file: file.name })" @click="move(file, index, index - 1, 'earlier')" />
        <NButton class="playlist-card__button" data-button="later" icon="chevron-down" :disabled="index === playlist.files.length - 1" :label="t('playlistCard.later', { file: file.name })" @click="move(file, index, index + 1, 'later')" />
        <NButton class="playlist-card__button" icon="close" :label="t('playlistCard.removeFile', { file: file.name, name: playlist.name })" @click="emit('removeFile', file)" />
      </li>
    </ol>
    <p class="playlist-card__hint">{{ usedBy.length === 0 ? t('playlistCard.notUsed') : t('playlistCard.usedBy', { names: usedBy.join(', ') }) }}</p>
    <template #footer>
      <NButton class="playlist-card__add" icon="plus" :label="t('playlistCard.addFiles', { name: playlist.name })" @click="chooser?.click()">{{ t('playlistCard.addFilesShort') }}</NButton>
      <input
        ref="chooser"
        type="file"
        accept="audio/*"
        multiple
        hidden
        :aria-label="t('playlistCard.chooser', { name: playlist.name })"
        @change="choose"
      >
    </template>
  </NCard>
</template>

<style scoped>
.playlist-card__rename {
  flex: 1;
  min-width: 0;
}

.playlist-card__files {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.playlist-card__file {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  padding: 5px 6px 5px 9px;
  border: 1px solid var(--n-line);
  border-radius: var(--n-radius-control);
  background: var(--n-surface);
  font-size: 12px;
}

.playlist-card__number {
  width: 16px;
  color: var(--n-text-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.playlist-card__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlist-card__add {
  flex: 1;
}

.playlist-card__hint {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 12px;
}

.playlist-card__file .playlist-card__button {
  width: 24px;
  min-height: 24px;
  padding: 3px;
}

.playlist-card__length {
  color: var(--n-text-muted);
  font-variant-numeric: tabular-nums;
}
</style>
