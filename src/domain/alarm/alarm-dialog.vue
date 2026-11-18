<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import NDayPicker from '@/ui/n-day-picker/index.vue'
import NDialog from '@/ui/n-dialog/index.vue'
import NField from '@/ui/n-field/index.vue'
import NFieldset from '@/ui/n-fieldset/index.vue'
import NSwitchRow from '@/ui/n-switch-row/index.vue'
import NTextField from '@/ui/n-text-field/index.vue'
import { parseDay, type Day, type Weekday } from '@/utils/time/calendar'
import { formatTimeOfDay, parseTimeOfDay } from '@/utils/time/time-of-day'
import type { Moment } from '@/utils/time/units'
import { ringSoundOf, type Sound } from '../sound/model/sound'
import { holdPickedSounds } from '../sound/picked-sounds'
import SoundChoice from '../sound/sound-choice.vue'
import { localUtcOffsetAt } from './local-offset'
import { ringOnDate, type Alarm, type AlarmDays, type AlarmDetails } from './model/alarm'

const HOUR = 3_600_000

const props = defineProps<{
  open: boolean
  alarm: Alarm | null
  today: Day
  now: Moment
}>()

const emit = defineEmits<{
  save: [details: AlarmDetails]
  remove: []
  close: []
}>()

const KINDS: readonly AlarmDays['kind'][] = ['one-time', 'repeating']
const WORKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5]

const { t } = useI18n()
const daysErrorId = useId()

const name = ref('')
const time = ref('')
const kind = ref<AlarmDays['kind']>('repeating')
const date = ref('')
const repeatDays = ref<Weekday[]>([])
const sendsNotification = ref(true)
const ringSound = ref<Sound>(ringSoundOf({}))
const triedToSave = ref(false)
const picks = holdPickedSounds()

function startFrom(alarm: Alarm | null) {
  name.value = alarm?.name ?? ''
  time.value = formatTimeOfDay(alarm?.time ?? 8 * HOUR)
  kind.value = alarm?.days.kind ?? 'repeating'
  date.value = alarm?.days.kind === 'one-time' ? alarm.days.date : props.today
  repeatDays.value = alarm?.days.kind === 'repeating' ? [...alarm.days.repeatDays] : [...WORKDAYS]
  sendsNotification.value = alarm?.sendsNotification ?? true
  ringSound.value = ringSoundOf(alarm ?? {})
  triedToSave.value = false
  picks.clear()
}

watch(() => props.open, (open) => open && startFrom(props.alarm), { immediate: true })

const fields = useTemplateRef('fields')
const nameError = computed(() => triedToSave.value && name.value.trim() === '' ? t('alarmDialog.error.name') : undefined)
const parsedTime = computed(() => parseTimeOfDay(time.value))
const timeError = computed(() => triedToSave.value && parsedTime.value === null ? t('alarmDialog.error.time') : undefined)
const switchesOn = computed(() => {
  const { alarm } = props
  return alarm === null || alarm.days.kind !== 'one-time' || alarm.days.date !== date.value || alarm.time !== parsedTime.value
})
const dateError = computed(() => {
  if (!triedToSave.value || kind.value !== 'one-time') {
    return undefined
  }
  if (parseDay(date.value) === null) {
    return t('alarmDialog.error.date')
  }
  if (parsedTime.value !== null && switchesOn.value && ringOnDate(date.value, parsedTime.value, localUtcOffsetAt) <= props.now) {
    return t('alarmDialog.error.passed')
  }
  return undefined
})
const daysError = computed(() => triedToSave.value && kind.value === 'repeating' && repeatDays.value.length === 0 ? t('alarmDialog.error.repeatDays') : undefined)

async function focusFirstError() {
  await nextTick()
  fields.value?.querySelector<HTMLElement>('[aria-invalid="true"], fieldset[aria-describedby] button')?.focus()
}

async function save() {
  triedToSave.value = true
  if (parsedTime.value === null || [nameError, dateError, daysError].some((error) => error.value !== undefined)) {
    void focusFirstError()
    return
  }
  const days: AlarmDays = kind.value === 'one-time' ? { kind: 'one-time', date: date.value } : { kind: 'repeating', repeatDays: repeatDays.value }
  const savedTime = parsedTime.value
  const keptRingSound = await picks.kept(ringSound.value)
  emit('save', { name: name.value.trim(), time: savedTime, days, sendsNotification: sendsNotification.value, ringSound: keptRingSound })
}
</script>

<template>
  <NDialog :open="open" form :title="t(`alarmDialog.title.${alarm === null ? 'new' : 'edit'}`)" @close="emit('close')" @submit="save">
    <div ref="fields" class="alarm-dialog">
      <NTextField v-model="name" :label="t('alarmDialog.name')" :error="nameError" />
      <NField v-slot="{ describedBy, invalid }" :label="t('alarmDialog.time')" :error="timeError">
        <input v-model="time" class="n-field__control" type="time" :aria-describedby="describedBy" :aria-invalid="invalid">
      </NField>
      <NFieldset :legend="t('alarmDialog.rings')">
        <NButton v-for="choice in KINDS" :key="choice" :pressed="kind === choice" @click="kind = choice">{{ t(`alarmDialog.kind.${choice}`) }}</NButton>
      </NFieldset>
      <NField v-if="kind === 'one-time'" v-slot="{ describedBy, invalid }" :label="t('alarmDialog.date')" :error="dateError">
        <input v-model="date" class="n-field__control" type="date" :aria-describedby="describedBy" :aria-invalid="invalid">
      </NField>
      <div v-else class="alarm-dialog__days">
        <NDayPicker v-model="repeatDays" :label="t('alarmDialog.repeatDays')" :aria-describedby="daysError ? daysErrorId : undefined" />
        <span v-if="daysError" :id="daysErrorId" class="alarm-dialog__error">{{ daysError }}</span>
      </div>
      <SoundChoice v-model="ringSound" :label="t('alarmDialog.ringSound')" />
      <NSwitchRow v-model="sendsNotification" :label="t('alarmDialog.notification')" :hint="t('alarmDialog.notificationHint')" />
    </div>
    <template #actions>
      <NButton v-if="alarm !== null" class="alarm-dialog__delete" :label="t('alarmDialog.delete', { name: alarm.name })" @click="emit('remove')">{{ t('alarmDialog.deleteShort') }}</NButton>
      <NButton @click="emit('close')">{{ t('alarmDialog.cancel') }}</NButton>
      <NButton type="submit" variant="primary">{{ t('alarmDialog.save') }}</NButton>
    </template>
  </NDialog>
</template>

<style scoped>
.alarm-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alarm-dialog__days {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.alarm-dialog__error {
  color: var(--n-warning);
  font-size: 11.5px;
  font-weight: 600;
}

.alarm-dialog__delete {
  margin-inline-end: auto;
}
</style>
