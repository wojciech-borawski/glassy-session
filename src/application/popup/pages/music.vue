<script setup lang="ts">
import { useStoredAsOfNow } from '@/domain/command/stored-as-of-now'
import type { SoundOwner } from '@/domain/music/model/playback'
import type { Playlist } from '@/domain/music/model/playlist'
import PlaylistCard from '@/domain/music/playlist-card.vue'
import { useStoredPlaylists } from '@/domain/music/stored-playlists'
import { useMusicCommands } from '@/domain/music/use-music-commands'
import NButton from '@/ui/n-button/index.vue'

const { t } = useI18n()
const commands = useMusicCommands()
const headingId = useId()
const { playlists, backgroundSounds } = useStoredPlaylists()
const asOfNow = useStoredAsOfNow()

const ownerKey = ({ of, id }: SoundOwner) => `${of}:${id}`

/** The name of each stored timer and focus session, by its owner key. A sound whose owner is no longer stored has no name. */
const ownerNames = computed(() => new Map([
  ...asOfNow.value.timers.map(({ id, name }) => [ownerKey({ of: 'timer', id }), name] as const),
  ...asOfNow.value.sessions.map(({ id, name }) => [ownerKey({ of: 'focus session', id }), name] as const)
]))

/** The stored timers and focus sessions whose background sound is this playlist. */
function ownersOf(playlist: Playlist): readonly SoundOwner[] {
  return backgroundSounds.value
    .filter(({ owner, sound }) => sound.playlistId === playlist.id && ownerNames.value.has(ownerKey(owner)))
    .map(({ owner }) => owner)
}

function usersOf(playlist: Playlist): readonly string[] {
  return ownersOf(playlist).flatMap((owner) => ownerNames.value.get(ownerKey(owner)) ?? [])
}

function remove(playlist: Playlist) {
  const owners = ownersOf(playlist)
  void commands.remove(playlist, {
    timers: owners.filter(({ of }) => of === 'timer').length,
    focusSessions: owners.filter(({ of }) => of === 'focus session').length
  })
}

const section = useTemplateRef('section')

/** Adds a playlist named with the first number no playlist uses yet, and puts the cursor in its name field. */
async function addPlaylist() {
  const taken = new Set(playlists.value.map(({ name }) => name))
  let number = 1
  while (taken.has(t('music.newName', { number }))) {
    number += 1
  }
  if (await commands.add(t('music.newName', { number })) === null) {
    await nextTick()
    const cards = section.value?.querySelectorAll('article')
    cards?.[cards.length - 1]?.querySelector('input')?.focus()
  }
}
</script>

<template>
  <section ref="section" class="music" :aria-labelledby="headingId">
    <header class="music__header">
      <h2 :id="headingId" class="music__heading">{{ t('music.playlists') }}</h2>
      <NButton icon="plus" @click="addPlaylist">{{ t('music.new') }}</NButton>
    </header>
    <p v-if="playlists.length === 0" class="music__hint">{{ t('music.hint') }}</p>
    <PlaylistCard
      v-for="playlist in playlists"
      :key="playlist.id"
      :playlist="playlist"
      :used-by="usersOf(playlist)"
      @rename="commands.rename(playlist, $event)"
      @remove="remove(playlist)"
      @add-files="commands.addFiles(playlist, $event)"
      @move-file="(from, to) => commands.moveFile(playlist, from, to)"
      @remove-file="commands.removeFile(playlist, $event)"
    />
  </section>
</template>

<style scoped>
.music {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.music__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.music__hint {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 12px;
}

.music__heading {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 13px;
  font-weight: var(--n-font-weight-strong);
}
</style>
