<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import NCard from '@/ui/n-card/index.vue'
import NSwitch from '@/ui/n-switch/index.vue'
import { formatTimeOfDay } from '@/utils/time/time-of-day'
import type { Alarm } from './model/alarm'

const props = defineProps<{
  alarm: Alarm
}>()

const emit = defineEmits<{
  switchOn: []
  switchOff: []
  edit: []
}>()

const { t, locale } = useI18n()
const nameId = useId()

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const NAMED_DAYS: Readonly<Record<string, string>> = {
  '0,1,2,3,4,5,6': 'everyDay',
  '1,2,3,4,5': 'weekdays',
  '0,6': 'weekends'
}

const days = computed(() => {
  if (props.alarm.days.kind === 'one-time') {
    const date = new Date(`${props.alarm.days.date}T00:00:00Z`)
    return t('alarm.days.once', { date: date.toLocaleDateString(locale.value, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) })
  }
  const { repeatDays } = props.alarm.days
  const named = NAMED_DAYS[repeatDays.join(',')]
  return named === undefined
    ? repeatDays.map((day) => t(`alarm.days.short.${WEEKDAYS[day]}`)).join(', ')
    : t(`alarm.days.${named}`)
})
</script>

<template>
  <NCard as="article" class="alarm-card" :aria-labelledby="nameId">
    <template #header>
      <p class="alarm-card__time" :class="{ 'alarm-card__dimmed': !alarm.switchedOn }">{{ formatTimeOfDay(alarm.time) }}</p>
      <NSwitch :label="t('alarm.ring', { name: alarm.name })" :model-value="alarm.switchedOn" @update:model-value="on => on ? emit('switchOn') : emit('switchOff')" />
    </template>
    <b :id="nameId" class="alarm-card__name" :class="{ 'alarm-card__dimmed': !alarm.switchedOn }">{{ alarm.name }}</b>
    <p class="alarm-card__days" :class="{ 'alarm-card__dimmed': !alarm.switchedOn }">{{ days }}</p>
    <template #footer>
      <NButton class="alarm-card__edit" icon="pencil" :label="t('alarm.edit', { name: alarm.name })" @click="emit('edit')" />
    </template>
  </NCard>
</template>

<style scoped>
.alarm-card__time {
  flex: 1;
  margin: 0;
  font-size: 24px;
  font-variant-numeric: tabular-nums;
  font-weight: var(--n-font-weight-strong);
  line-height: 1.1;
}

.alarm-card__name {
  overflow: hidden;
  font-weight: var(--n-font-weight-strong);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alarm-card__days {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 11.5px;
}

.alarm-card__dimmed {
  opacity: .55;
  filter: grayscale(.85);
}

.alarm-card__edit {
  margin-inline-start: auto;
}
</style>
