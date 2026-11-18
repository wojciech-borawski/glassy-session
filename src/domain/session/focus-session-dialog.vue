<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import NCheckbox from '@/ui/n-checkbox/index.vue'
import NDialog from '@/ui/n-dialog/index.vue'
import NFieldset from '@/ui/n-fieldset/index.vue'
import NNumberField from '@/ui/n-number-field/index.vue'
import NSwitchRow from '@/ui/n-switch-row/index.vue'
import NTextField from '@/ui/n-text-field/index.vue'
import { formatHoursAndMinutes } from '@/utils/time/format-duration'
import type { Moment } from '@/utils/time/units'
import { remainingTimeAt, type Timer } from '../timer/model/timer'
import type { FocusSession, FocusSessionSettings } from './model/focus-session'
import type { Order } from './model/plan'

const MINUTE = 60_000

const ORDERS: readonly { order: Order, key: string }[] = [{ order: 'one after another', key: 'oneAfterAnother' }, { order: 'alternating', key: 'alternating' }]

const props = defineProps<{
  open: boolean
  session: FocusSession | null
  tasks: readonly Timer[]
  now: Moment
}>()

const emit = defineEmits<{
  save: [settings: FocusSessionSettings]
  remove: []
  close: []
}>()

const { t } = useI18n()

const name = ref('')
const taskIds = ref<readonly string[]>([])
const stepMinutes = ref(25)
const breakMinutes = ref(5)
const order = ref<Order>('one after another')
const pinned = ref(false)
const triedToSave = ref(false)

function startFrom(session: FocusSession | null) {
  name.value = session?.name ?? ''
  taskIds.value = session?.taskIds ?? []
  stepMinutes.value = Math.round((session?.stepLength ?? 25 * MINUTE) / MINUTE)
  breakMinutes.value = Math.round((session?.breakLength ?? 5 * MINUTE) / MINUTE)
  order.value = session?.order ?? 'one after another'
  pinned.value = session?.pinned === true
  triedToSave.value = false
}

watch(() => props.open, (open) => open && startFrom(props.session), { immediate: true })

const storedTasks = computed(() => props.tasks.filter(({ kind }) => kind === 'task'))

function whatIsLeft(task: Timer): string {
  const left = remainingTimeAt(task, props.now)
  return left > 0 ? t('focusSessionDialog.left', { left: formatHoursAndMinutes(left) }) : t('timer.finished.task')
}

function toggle(taskId: string, ticked: boolean) {
  taskIds.value = ticked ? [...taskIds.value, taskId] : taskIds.value.filter((id) => id !== taskId)
}

const fields = useTemplateRef('fields')
const nameError = computed(() => triedToSave.value && name.value.trim() === '' ? t('focusSessionDialog.error.name') : undefined)
const tasksError = computed(() => triedToSave.value && taskIds.value.length === 0 ? t('focusSessionDialog.error.tasks') : undefined)

async function focusFirstMissing() {
  await nextTick()
  const missing = nameError.value === undefined ? 'fieldset[aria-describedby] input' : 'input[aria-invalid="true"]'
  fields.value?.querySelector<HTMLElement>(missing)?.focus()
}

function save() {
  triedToSave.value = true
  if (nameError.value !== undefined || tasksError.value !== undefined) {
    void focusFirstMissing()
    return
  }
  emit('save', {
    name: name.value.trim(),
    taskIds: taskIds.value,
    stepLength: stepMinutes.value * MINUTE,
    breakLength: breakMinutes.value * MINUTE,
    order: order.value,
    ...pinned.value === (props.session?.pinned === true) ? {} : { pinned: pinned.value }
  })
}
</script>

<template>
  <NDialog :open="open" form :title="t(`focusSessionDialog.title.${session === null ? 'new' : 'edit'}`)" @close="emit('close')" @submit="save">
    <div ref="fields" class="focus-session-dialog">
      <NTextField v-model="name" :label="t('focusSessionDialog.name')" :error="nameError" />
      <NFieldset :legend="t('focusSessionDialog.tasks')" :error="tasksError">
        <div class="focus-session-dialog__tasks">
          <NCheckbox
            v-for="task in storedTasks"
            :key="task.id"
            :label="task.name"
            :hint="whatIsLeft(task)"
            :model-value="taskIds.includes(task.id)"
            @update:model-value="ticked => toggle(task.id, ticked)"
          />
        </div>
      </NFieldset>
      <div class="focus-session-dialog__lengths">
        <NNumberField v-model="stepMinutes" :label="t('focusSessionDialog.stepLength')" :min="1" :max="240" />
        <NNumberField v-model="breakMinutes" :label="t('focusSessionDialog.breakLength')" :min="0" :max="120" />
      </div>
      <p class="focus-session-dialog__hint">{{ t('focusSessionDialog.noBreaksHint') }}</p>
      <NFieldset :legend="t('focusSessionDialog.order')">
        <NButton v-for="choice in ORDERS" :key="choice.key" :pressed="order === choice.order" @click="order = choice.order">{{ t(`focusSessionDialog.orders.${choice.key}`) }}</NButton>
      </NFieldset>
      <NSwitchRow v-model="pinned" :label="t('focusSessionDialog.pin')" :hint="t('focusSessionDialog.pinHint')" />
      <!-- The background sound fields, given by the caller so the session area knows nothing of music. -->
      <slot name="sound" />
    </div>
    <template #actions>
      <NButton v-if="session !== null" class="focus-session-dialog__delete" :label="t('focusSessionDialog.delete', { name: session.name })" @click="emit('remove')">{{ t('focusSessionDialog.deleteShort') }}</NButton>
      <NButton @click="emit('close')">{{ t('focusSessionDialog.cancel') }}</NButton>
      <NButton type="submit" variant="primary">{{ t('focusSessionDialog.save') }}</NButton>
    </template>
  </NDialog>
</template>

<style scoped>
.focus-session-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.focus-session-dialog__tasks {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.focus-session-dialog__lengths {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.focus-session-dialog__hint {
  margin: -6px 0 0;
  color: var(--n-text-muted);
  font-size: 11.5px;
}

.focus-session-dialog__delete {
  margin-inline-end: auto;
}
</style>
