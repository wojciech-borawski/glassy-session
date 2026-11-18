<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import { soundOf } from './model/background-sound'
import { heardOwner, isSameOwner, noFileCanPlay, type SoundOwner } from './model/playback'
import SoundVolume from './sound-volume.vue'
import { useStoredHeardSound } from './stored-heard-sound'
import { useSoundCommands } from './use-sound-commands'

const props = defineProps<{
  owner: SoundOwner
  /** The name of the timer or focus session, which the controls' labels name. */
  name: string
  /**
   * How much room the controls have. `full`, the default, shows every control with the volume slider. `chip` shows the same controls
   * smaller, with the volume behind a button that opens its slider. `compact` shows only pausing and resuming the sound, for a row
   * with little room, and then needs only the stored heard sound. Only `full` says why the sound stopped when no file of its playlist can play.
   */
  size?: 'full' | 'chip' | 'compact'
}>()

const { t } = useI18n()
const { playlists, backgroundSounds, playback } = useStoredHeardSound()
const { run } = useSoundCommands()

const compact = computed(() => props.size === 'compact')
const volumeShown = ref(false)
const volume = ref<HTMLElement | null>(null)

async function showVolume(): Promise<void> {
  volumeShown.value = !volumeShown.value
  if (volumeShown.value) {
    await nextTick()
    volume.value?.querySelector('input')?.focus()
  }
}

function hideVolume(): void {
  volumeShown.value = false
  volume.value?.querySelector('button')?.focus()
}

function hideVolumeOnLeaving(event: FocusEvent): void {
  if (!volume.value?.contains(event.relatedTarget as Node | null)) {
    volumeShown.value = false
  }
}

const library = computed(() => ({ playlists: playlists.value, soundOf: (owner: SoundOwner) => soundOf(backgroundSounds.value, owner) }))
const heard = computed(() => {
  const owner = heardOwner(playback.value, library.value)
  return owner !== null && isSameOwner(owner, props.owner)
})
const whyStopped = computed(() => {
  if ((props.size ?? 'full') !== 'full' || !noFileCanPlay(playback.value, library.value)) {
    return null
  }
  const { playlistId } = library.value.soundOf(props.owner)
  const playlist = playlists.value.find(({ id }) => id === playlistId)
  return t('soundControls.noFileCanPlay', { playlist: playlist?.name ?? '' })
})
</script>

<template>
  <div v-if="heard" class="sound-controls" :class="`sound-controls--${size ?? 'full'}`" role="group" :aria-label="t('soundControls.label', { name })">
    <NButton v-if="!compact" class="sound-controls__button" icon="skip-back" :label="t('soundControls.previous', { name })" @click="run({ type: 'previousFile' })" />
    <NButton
      v-if="playback.soundPaused"
      class="sound-controls__button"
      :icon="compact ? 'volume-off' : 'play'"
      :label="t('soundControls.resume', { name })"
      @click="run({ type: 'resumeSound' })"
    />
    <NButton
      v-else
      class="sound-controls__button"
      :icon="compact ? 'volume' : 'pause'"
      :label="t('soundControls.pause', { name })"
      @click="run({ type: 'pauseSound' })"
    />
    <NButton v-if="!compact" class="sound-controls__button" icon="skip-forward" :label="t('soundControls.next', { name })" @click="run({ type: 'nextFile' })" />
    <span v-if="whyStopped !== null" class="sound-controls__why">{{ whyStopped }}</span>
    <SoundVolume v-if="size === undefined || size === 'full'" :owner="owner" :name="name" />
    <span v-else-if="size === 'chip'" ref="volume" class="sound-controls__volume" @keydown.esc="hideVolume" @focusout="hideVolumeOnLeaving">
      <NButton
        class="sound-controls__button"
        icon="volume"
        :label="t('soundControls.showVolume', { name })"
        :aria-expanded="volumeShown"
        @click="showVolume"
      />
      <SoundVolume v-if="volumeShown" :owner="owner" :name="name" />
    </span>
  </div>
</template>

<style scoped>
.sound-controls {
  display: flex;
  flex: none;
  align-items: center;
  width: fit-content;
  gap: 2px;
  padding: 2px 8px 2px 2px;
  border-radius: 999px;
  background: var(--n-surface-soft);
}

.sound-controls--compact,
.sound-controls--chip {
  padding: 2px;
}

.sound-controls__why {
  padding: 0 4px;
  color: var(--n-text-muted);
  font-size: 12px;
}

.sound-controls__volume {
  display: flex;
  align-items: center;
}

.sound-controls .sound-controls__button {
  min-height: 24px;
  padding: 3px 6px;
  border-radius: 999px;
}

.sound-controls--chip .sound-controls__button {
  min-height: 22px;
  padding: 2px 4px;
}

.sound-controls--chip .sound-volume {
  width: 56px;
  margin: 0 6px 0 2px;
}
</style>
