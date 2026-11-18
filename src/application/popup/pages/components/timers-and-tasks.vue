<script setup lang="ts">
import { useStoredAsOfNow, useTrackingAsOfNow } from '@/domain/command/stored-as-of-now'
import { useDisplayClock } from '@/domain/display-clock'
import BackgroundSoundFields from '@/domain/music/background-sound-fields.vue'
import SoundControls from '@/domain/music/sound-controls.vue'
import { useBackgroundSoundChoice } from '@/domain/music/use-background-sound-choice'
import { isForToday, type Timer, type TimerDetails } from '@/domain/timer/model/timer'
import TimerDialog from '@/domain/timer/timer-dialog.vue'
import TimerList from '@/domain/timer/timer-list.vue'
import { useTimerCommands } from '@/domain/timer/use-timer-commands'
import { localDayOf } from '@/domain/tracking/local-day'
import { lastTimeOf, type RepeatDayResult } from '@/domain/tracking/model/repeat-day-results'
import NButton from '@/ui/n-button/index.vue'

const props = defineProps<{
  heading: string
  /** Shows only the timers and tasks that belong on Today. */
  onlyToday?: boolean
}>()

const { t } = useI18n()
const headingId = useId()
const asOfNow = useStoredAsOfNow()
const tracking = useTrackingAsOfNow()
const router = useRouter()
const now = useDisplayClock()
const commands = useTimerCommands()
const sound = useBackgroundSoundChoice()

const shown = computed(() => asOfNow.value.timers
  .filter((timer) => !props.onlyToday || isForToday(timer, now.value, localDayOf)))

const lastTimes = computed(() => {
  const today = localDayOf(now.value).day
  const lastTimes = new Map<string, RepeatDayResult>()
  for (const { id, repeatDays } of shown.value) {
    const lastTime = repeatDays === undefined ? null : lastTimeOf(tracking.value.repeatDayResults, id, repeatDays, today)
    if (lastTime !== null) {
      lastTimes.set(id, lastTime)
    }
  }
  return lastTimes
})

function skipToday(task: Timer) {
  void commands.skipToday(task, asOfNow.value.usedInRun.get(task.id)?.name)
}

function openStatistics(task: Timer) {
  dialogOpen.value = false
  void router.push({ path: '/statistics', query: { task: task.id } })
}

const dialogOpen = ref(false)
const newButton = useTemplateRef<{ $el: HTMLElement }>('newButton')
const editing = shallowRef<Timer | null>(null)

function openDialog(timer: Timer | null) {
  editing.value = timer
  sound.startFrom(timer === null ? null : { of: 'timer', id: timer.id })
  dialogOpen.value = true
}

async function remove() {
  if (editing.value !== null && await commands.remove(editing.value) === null) {
    dialogOpen.value = false
    await nextTick()
    newButton.value?.$el.focus()
  }
}

async function save({ kind, details }: { kind: Timer['kind'], details: TimerDetails }) {
  const id = editing.value?.id ?? crypto.randomUUID()
  const refusal = editing.value === null ? await commands.add(kind, details, id) : await commands.change(editing.value, details)
  if (refusal === null) {
    dialogOpen.value = false
    await sound.keep({ of: 'timer', id }, details.name)
  }
}
</script>

<template>
  <section class="timers-and-tasks" :aria-labelledby="headingId">
    <header class="timers-and-tasks__header">
      <h2 :id="headingId" class="timers-and-tasks__heading">{{ heading }}</h2>
      <NButton ref="newButton" icon="plus" @click="openDialog(null)">{{ t('timersAndTasks.new') }}</NButton>
    </header>
    <TimerList :timers="shown" :now="now" :used-in-run="asOfNow.usedInRun" :last-times="lastTimes" @start="commands.start" @pause="commands.pause" @reset="commands.reset" @mark-done="commands.markDone" @undo-done="commands.undoDone" @skip-today="skipToday" @edit="openDialog" @pin="commands.pin" @unpin="commands.unpin" @statistics="openStatistics">
      <template #sound="{ timer }">
        <SoundControls :owner="{ of: 'timer', id: timer.id }" :name="timer.name" />
      </template>
    </TimerList>
    <TimerDialog :open="dialogOpen" :timer="editing" @save="save" @remove="remove" @close="dialogOpen = false" @statistics="editing !== null && openStatistics(editing)">
      <template #sound>
        <BackgroundSoundFields v-model="sound.draft.value" :playlists="sound.playlists.value" />
      </template>
    </TimerDialog>
  </section>
</template>

<style scoped>
.timers-and-tasks {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timers-and-tasks__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.timers-and-tasks__heading {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 13px;
  font-weight: var(--n-font-weight-strong);
}
</style>
