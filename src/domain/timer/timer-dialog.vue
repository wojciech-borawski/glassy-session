<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import NColourPicker from '@/ui/n-colour-picker/index.vue'
import NDayPicker from '@/ui/n-day-picker/index.vue'
import NDialog from '@/ui/n-dialog/index.vue'
import NFieldset from '@/ui/n-fieldset/index.vue'
import NNumberField from '@/ui/n-number-field/index.vue'
import NSwitchRow from '@/ui/n-switch-row/index.vue'
import NTextField from '@/ui/n-text-field/index.vue'
import type { ColourName } from '@/ui/colours'
import type { Weekday } from '@/utils/time/calendar'
import { ringSoundOf, type Sound } from '../sound/model/sound'
import { holdPickedSounds } from '../sound/picked-sounds'
import SoundChoice from '../sound/sound-choice.vue'
import type { Timer, TimerDetails } from './model/timer'

const HOUR = 3_600_000
const MINUTE = 60_000

const props = defineProps<{
  open: boolean
  timer: Timer | null
}>()

const emit = defineEmits<{
  save: [draft: { kind: Timer['kind'], details: TimerDetails }]
  remove: []
  close: []
  statistics: []
}>()

const { t } = useI18n()

const KINDS: readonly Timer['kind'][] = ['task', 'timer']

const REPEATS = ['oneTime', 'repeating'] as const

const kind = ref<Timer['kind']>('task')
const name = ref('')
const hours = ref(0)
const minutes = ref(0)
const description = ref('')
const colour = ref<ColourName>('blue')
const repeats = ref(false)
const repeatDays = ref<number[]>([])
const ringSound = ref<Sound>(ringSoundOf({}))
const pinned = ref(false)
const triedToSave = ref(false)
const picks = holdPickedSounds()

function startFrom(timer: Timer | null) {
  const planned = timer?.plannedTime ?? 25 * MINUTE
  kind.value = timer?.kind ?? 'task'
  name.value = timer?.name ?? ''
  hours.value = Math.floor(planned / HOUR)
  minutes.value = Math.round(planned % HOUR / MINUTE)
  description.value = timer?.description ?? ''
  colour.value = timer?.appearance.colour ?? 'blue'
  repeats.value = timer?.repeatDays !== undefined
  repeatDays.value = [...timer?.repeatDays ?? []]
  ringSound.value = ringSoundOf(timer ?? {})
  pinned.value = timer?.pinned === true
  triedToSave.value = false
  picks.clear()
}

watch(() => props.open, (open) => open && startFrom(props.timer), { immediate: true })

const fields = useTemplateRef('fields')
const plannedTime = computed(() => hours.value * HOUR + minutes.value * MINUTE)
const plannedTimeError = computed(() => triedToSave.value && plannedTime.value <= 0 ? t('timerDialog.error.plannedTime') : undefined)
const nameError = computed(() => triedToSave.value && name.value.trim() === '' ? t('timerDialog.error.name') : undefined)
const repeatDaysError = computed(() => triedToSave.value && kind.value === 'task' && repeats.value && repeatDays.value.length === 0 ? t('timerDialog.error.repeatDays') : undefined)
const repeatDaysErrorId = useId()

async function focusFirstError() {
  await nextTick()
  fields.value?.querySelector<HTMLElement>('input[aria-describedby], [aria-describedby] input, [aria-describedby] button')?.focus()
}

async function save() {
  triedToSave.value = true
  if (nameError.value !== undefined || plannedTimeError.value !== undefined || repeatDaysError.value !== undefined) {
    void focusFirstError()
    return
  }
  const typedDescription = description.value.trim()
  const keptRingSound = await picks.kept(ringSound.value)
  emit('save', {
    kind: kind.value,
    details: {
      name: name.value.trim(),
      ...typedDescription === '' ? {} : { description: typedDescription },
      plannedTime: plannedTime.value,
      appearance: { colour: colour.value },
      ...kind.value === 'task' && repeats.value ? { repeatDays: repeatDays.value as Weekday[] } : {},
      ringSound: keptRingSound,
      ...pinned.value === (props.timer?.pinned === true) ? {} : { pinned: pinned.value }
    }
  })
}
</script>

<template>
  <NDialog :open="open" form :title="t(`timerDialog.title.${timer === null ? 'new' : 'edit'}.${kind}`)" @close="emit('close')" @submit="save">
    <div ref="fields" class="timer-dialog">
      <NTextField v-model="name" :label="t('timerDialog.name')" :error="nameError" />
      <NFieldset v-if="timer === null" :legend="t('timerDialog.kind')">
        <NButton v-for="choice in KINDS" :key="choice" :pressed="kind === choice" @click="kind = choice">{{ t(`timer.kind.${choice}`) }}</NButton>
      </NFieldset>
      <p v-if="timer === null" class="timer-dialog__hint">{{ t(`timerDialog.kindHint.${kind}`) }}</p>
      <NFieldset :legend="t('timerDialog.plannedTime')" :error="plannedTimeError">
        <NNumberField v-model="hours" :label="t('timerDialog.hours')" :min="0" :max="99" />
        <NNumberField v-model="minutes" :label="t('timerDialog.minutes')" :min="0" :max="59" />
      </NFieldset>
      <NTextField v-model="description" :label="t('timerDialog.description')" />
      <NColourPicker v-model="colour" :label="t('timerDialog.colour')" />
      <SoundChoice v-model="ringSound" :label="t('timerDialog.ringSound')" />
      <NFieldset v-if="kind === 'task'" :legend="t('timerDialog.repeat')">
        <NButton v-for="choice in REPEATS" :key="choice" :pressed="repeats === (choice === 'repeating')" @click="repeats = choice === 'repeating'">{{ t(`timerDialog.repeatChoice.${choice}`) }}</NButton>
      </NFieldset>
      <div v-if="kind === 'task' && repeats" class="timer-dialog__repeat-days">
        <NDayPicker v-model="repeatDays" :label="t('timerDialog.repeatDays')" :aria-describedby="repeatDaysError ? repeatDaysErrorId : undefined" />
        <span v-if="repeatDaysError" :id="repeatDaysErrorId" class="timer-dialog__error">{{ repeatDaysError }}</span>
      </div>
      <NSwitchRow v-model="pinned" :label="t('timerDialog.pin')" :hint="t('timerDialog.pinHint')" />
      <!-- The background sound fields, given by the caller so the timer area knows nothing of music. -->
      <slot name="sound" />
    </div>
    <template #actions>
      <NButton v-if="timer?.kind === 'task'" icon="chart" :label="t('timer.action.statistics', { name: timer.name })" @click="emit('statistics')" />
      <NButton v-if="timer !== null" class="timer-dialog__delete" :label="t('timerDialog.delete', { name: timer.name })" @click="emit('remove')">{{ t('timerDialog.deleteShort') }}</NButton>
      <NButton @click="emit('close')">{{ t('timerDialog.cancel') }}</NButton>
      <NButton type="submit" variant="primary">{{ t('timerDialog.save') }}</NButton>
    </template>
  </NDialog>
</template>

<style scoped>
.timer-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timer-dialog__hint {
  margin: -6px 0 0;
  color: var(--n-text-muted);
  font-size: 11.5px;
}

.timer-dialog__repeat-days {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.timer-dialog__error {
  color: var(--n-warning);
  font-size: 11.5px;
  font-weight: 600;
}

.timer-dialog__delete {
  margin-inline-end: auto;
}
</style>
