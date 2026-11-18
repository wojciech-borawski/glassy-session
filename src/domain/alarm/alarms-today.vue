<script setup lang="ts">
import { formatTimeOfDay } from '@/utils/time/time-of-day'
import type { Moment } from '@/utils/time/units'
import { localUtcOffsetAt } from './local-offset'
import { ringsLeftToday, type Alarm } from './model/alarm'

const props = defineProps<{
  alarms: readonly Alarm[]
  now: Moment
}>()

const { t } = useI18n()
const headingId = useId()

const rings = computed(() => ringsLeftToday(props.alarms, props.now, localUtcOffsetAt))
</script>

<template>
  <section v-if="rings.length > 0" class="alarms-today" :aria-labelledby="headingId">
    <h2 :id="headingId" class="alarms-today__heading">{{ t('alarmsToday.heading') }}</h2>
    <ul class="alarms-today__list">
      <li v-for="{ alarm } in rings" :key="alarm.id" class="alarms-today__ring">
        <span class="alarms-today__time">{{ formatTimeOfDay(alarm.time) }}</span> <span class="alarms-today__name">{{ alarm.name }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.alarms-today {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alarms-today__heading {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 13px;
  font-weight: var(--n-font-weight-strong);
}

.alarms-today__list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.alarms-today__ring {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--n-line);
  border-radius: var(--n-radius-control);
  background: var(--n-surface-soft);
  font-size: 13px;
}

.alarms-today__time {
  font-variant-numeric: tabular-nums;
  font-weight: var(--n-font-weight-strong);
}

.alarms-today__name {
  color: var(--n-text-muted);
}
</style>
