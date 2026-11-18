<script setup lang="ts">
import { useStoredAsOfNow } from '@/domain/command/stored-as-of-now'
import { useDisplayClock } from '@/domain/display-clock'
import BackgroundSoundFields from '@/domain/music/background-sound-fields.vue'
import SoundControls from '@/domain/music/sound-controls.vue'
import { useBackgroundSoundChoice } from '@/domain/music/use-background-sound-choice'
import FocusSessionDetail from '@/domain/session/focus-session-detail.vue'
import FocusSessionDialog from '@/domain/session/focus-session-dialog.vue'
import type { FocusSession, FocusSessionSettings } from '@/domain/session/model/focus-session'
import { useSessionCommands } from '@/domain/session/use-session-commands'
import NButton from '@/ui/n-button/index.vue'
import FocusSessionCards from './focus-session-cards.vue'

const { t } = useI18n()
const headingId = useId()
const asOfNow = useStoredAsOfNow()
const sessions = computed(() => asOfNow.value.sessions)
const timers = computed(() => asOfNow.value.timers)
const now = useDisplayClock()
const commands = useSessionCommands()
const sound = useBackgroundSoundChoice()
const route = useRoute()
const router = useRouter()

/** The running or paused session opened in detail, named in the route so Today can open it too. */
const opened = computed(() => sessions.value.find(({ id, run }) => id === route.query.session && run !== null) ?? null)

function open(session: FocusSession | null) {
  void router.push({ path: route.path, query: session === null ? {} : { session: session.id } })
}

const detailRoot = useTemplateRef<HTMLElement>('detailRoot')
const listRoot = useTemplateRef<HTMLElement>('listRoot')

/** Focus follows the view: into the detail when a session opens, and back to that session's card when it closes. */
watch(() => opened.value?.id, (id, before) => {
  if (id !== undefined) {
    detailRoot.value?.querySelector('button')?.focus()
  } else if (before !== undefined) {
    listRoot.value?.querySelector<HTMLElement>(`[data-session="${CSS.escape(before)}"] footer button:last-child`)?.focus()
  }
}, { flush: 'post' })

const dialogOpen = ref(false)
const editing = shallowRef<FocusSession | null>(null)

function openDialog(session: FocusSession | null) {
  editing.value = session
  sound.startFrom(session === null ? null : { of: 'focus session', id: session.id })
  dialogOpen.value = true
}

async function save(settings: FocusSessionSettings) {
  const id = editing.value?.id ?? crypto.randomUUID()
  const refusal = editing.value === null ? await commands.add(settings, id) : await commands.change(editing.value, settings)
  if (refusal === null) {
    dialogOpen.value = false
    await sound.keep({ of: 'focus session', id }, settings.name)
  }
}

async function remove() {
  if (editing.value !== null && await commands.remove(editing.value) === null) {
    dialogOpen.value = false
  }
}
</script>

<template>
  <div v-if="opened" ref="detailRoot" class="focus-sessions">
    <NButton class="focus-sessions__back" icon="chevron-left" @click="open(null)">{{ t('focusSessions.back') }}</NButton>
    <FocusSessionDetail
      :session="opened"
      :tasks="timers"
      :now="now"
      @pause="commands.pause(opened)"
      @resume="commands.resume(opened)"
      @skip="commands.skip(opened)"
      @end-early="commands.endEarly(opened)"
      @move-step="(from, to) => opened && commands.moveStep(opened, from, to)"
      @send-to-front="(step) => opened && commands.sendToFront(opened, step)"
      @add-task-steps="(task) => opened && commands.addTaskSteps(opened, task)"
      @mark-task-done="(task) => opened && commands.markTaskDone(opened, task)"
      @pin="commands.pin(opened)"
      @unpin="commands.unpin(opened)"
    >
      <template #sound>
        <SoundControls :owner="{ of: 'focus session', id: opened.id }" :name="opened.name" />
      </template>
    </FocusSessionDetail>
  </div>
  <section v-else ref="listRoot" class="focus-sessions" :aria-labelledby="headingId">
    <header class="focus-sessions__header">
      <h2 :id="headingId" class="focus-sessions__heading">{{ t('focusSessions.all') }}</h2>
      <NButton icon="plus" @click="openDialog(null)">{{ t('focusSessions.new') }}</NButton>
    </header>
    <p v-if="sessions.length === 0" class="focus-sessions__empty">{{ t('focusSessions.empty') }}</p>
    <FocusSessionCards :sessions="sessions" @edit="openDialog" />
    <FocusSessionDialog :open="dialogOpen" :session="editing" :tasks="timers" :now="now" @save="save" @remove="remove" @close="dialogOpen = false">
      <template #sound>
        <BackgroundSoundFields v-model="sound.draft.value" :playlists="sound.playlists.value" />
      </template>
    </FocusSessionDialog>
  </section>
</template>

<style scoped>
.focus-sessions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.focus-sessions__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.focus-sessions__back {
  align-self: flex-start;
}

.focus-sessions__empty {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 12px;
}

.focus-sessions__heading {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 13px;
  font-weight: var(--n-font-weight-strong);
}
</style>
