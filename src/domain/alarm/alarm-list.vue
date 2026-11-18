<script setup lang="ts">
import AlarmCard from './alarm-card.vue'
import type { Alarm } from './model/alarm'

defineProps<{
  alarms: readonly Alarm[]
}>()

const emit = defineEmits<{
  switchOn: [alarm: Alarm]
  switchOff: [alarm: Alarm]
  edit: [alarm: Alarm]
}>()

const { t } = useI18n()
</script>

<template>
  <p v-if="alarms.length === 0" class="alarm-list__empty">{{ t('alarmList.empty') }}</p>
  <ul v-else class="alarm-list">
    <li v-for="alarm in alarms" :key="alarm.id">
      <AlarmCard :alarm="alarm" @switch-on="emit('switchOn', alarm)" @switch-off="emit('switchOff', alarm)" @edit="emit('edit', alarm)" />
    </li>
  </ul>
</template>

<style scoped>
.alarm-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.alarm-list__empty {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 12px;
}
</style>
