<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import NSelect from '@/ui/n-select/index.vue'
import NSwatch from '@/ui/n-swatch/index.vue'
import { formatHoursAndMinutes } from '@/utils/time/format-duration'
import type { Timer } from '../timer/model/timer'
import type { UpNextStep } from './model/focus-session'

const props = defineProps<{
  steps: readonly UpNextStep[]
  tasks: readonly Timer[]
  addable: readonly Timer[]
}>()

const emit = defineEmits<{
  move: [from: number, to: number]
  sendToFront: [step: number]
  add: [task: Timer]
  markDone: [task: Timer]
}>()

const { t } = useI18n()

const taskOf = (step: UpNextStep) => props.tasks.find(({ id }) => id === step.taskId)
const named = (step: UpNextStep) => ({ number: step.step + 1, task: taskOf(step)?.name ?? '' })
/** Whether the step is the first in up next of its task, which alone offers to mark the task done. */
const isFirstOfTask = (step: UpNextStep, index: number) => props.steps.findIndex(({ taskId }) => taskId === step.taskId) === index

type MoveButton = 'earlier' | 'later' | 'toFront'

const list = useTemplateRef('list')

/** The step a button moved, and that button, so focus can follow the step to its new place once up next has changed. */
let moved: Readonly<{ step: number, button: MoveButton }> | null = null

function move(step: UpNextStep, to: number, button: MoveButton) {
  moved = { step: to, button }
  if (button === 'toFront') {
    emit('sendToFront', step.step)
  } else {
    emit('move', step.step, to)
  }
}

const chosenId = ref('')
const chosen = computed(() => props.addable.find(({ id }) => id === chosenId.value) ?? props.addable[0])
const addOptions = computed(() => props.addable.map(({ id, name }) => ({ value: id, label: name })))

function add() {
  if (chosen.value !== undefined) {
    emit('add', chosen.value)
  }
}

/** The step being dragged, while a drag is on. */
const dragged = ref<number | null>(null)

function startDrag(event: DragEvent, step: UpNextStep) {
  dragged.value = step.step
  event.dataTransfer?.setData('text/plain', String(step.step + 1))
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function allowDrop(event: DragEvent) {
  if (dragged.value !== null) {
    event.preventDefault()
  }
}

function drop(event: DragEvent, onto: UpNextStep) {
  const from = dragged.value
  dragged.value = null
  if (from === null) {
    return
  }
  event.preventDefault()
  if (from !== onto.step && props.steps.some(({ step }) => step === from)) {
    emit('move', from, onto.step)
  }
}

watch(() => props.steps, () => {
  if (moved === null) {
    return
  }
  const row = list.value?.querySelector(`[data-step="${moved.step}"]`)
  const buttons = Array.from(row?.querySelectorAll<HTMLButtonElement>('button') ?? [])
  const same = buttons.find((button) => button.dataset.button === moved?.button && !button.disabled)
  ;(same ?? buttons.find((button) => !button.disabled))?.focus()
  moved = null
}, { flush: 'post' })
</script>

<template>
  <div class="up-next">
  <p v-if="steps.length === 0" class="up-next__empty">{{ t('upNext.empty') }}</p>
  <ol v-else ref="list" class="up-next__steps" :aria-label="t('upNext.label')">
    <li
      v-for="(step, index) in steps"
      :key="step.step"
      class="up-next__step"
      :data-step="step.step"
      draggable="true"
      @dragstart="startDrag($event, step)"
      @dragover="allowDrop"
      @drop="drop($event, step)"
      @dragend="dragged = null"
    >
      <span class="up-next__number">{{ step.step + 1 }}</span>
      <NSwatch v-if="taskOf(step)" :colour="taskOf(step)!.appearance.colour" size="dot" />
      <b class="up-next__name">{{ taskOf(step)?.name }}</b>
      <span class="up-next__length">{{ formatHoursAndMinutes(step.length) }}</span>
      <NButton class="up-next__button" data-button="earlier" icon="chevron-up" :disabled="index === 0" :label="t('upNext.earlier', named(step))" @click="move(step, step.step - 1, 'earlier')" />
      <NButton class="up-next__button" data-button="later" icon="chevron-down" :disabled="index === steps.length - 1" :label="t('upNext.later', named(step))" @click="move(step, step.step + 1, 'later')" />
      <NButton class="up-next__button" data-button="toFront" icon="arrow-up" :disabled="index === 0" :label="t('upNext.toFront', named(step))" @click="move(step, steps[0]?.step ?? step.step, 'toFront')" />
      <NButton v-if="taskOf(step) && isFirstOfTask(step, index)" class="up-next__button" data-button="markDone" icon="check" :label="t('upNext.markDone', named(step))" @click="emit('markDone', taskOf(step)!)" />
      <span v-else class="up-next__button-space" />
    </li>
  </ol>
  <form v-if="chosen" class="up-next__add" @submit.prevent="add">
    <NSelect v-model="chosenId" class="up-next__task" :label="t('upNext.taskToAdd')" hide-label :options="addOptions" />
    <NButton type="submit" icon="plus">{{ t('upNext.add') }}</NButton>
  </form>
  </div>
</template>

<style scoped>
.up-next {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.up-next__steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.up-next__add {
  display: flex;
  gap: 6px;
}

.up-next__task {
  flex: 1;
}

.up-next__empty {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 12px;
}

.up-next__step {
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

.up-next__number {
  width: 16px;
  color: var(--n-text-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.up-next__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.up-next__step .up-next__button {
  width: 24px;
  min-height: 24px;
  padding: 3px;
}

.up-next__button-space {
  flex: none;
  width: 24px;
}

.up-next__length {
  color: var(--n-text-muted);
  font-variant-numeric: tabular-nums;
}
</style>
