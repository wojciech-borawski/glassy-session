<script setup lang="ts">
import AlarmsToday from '@/domain/alarm/alarms-today.vue'
import { useStoredAlarms } from '@/domain/alarm/stored-alarms'
import { useDisplayClock } from '@/domain/display-clock'
import FocusSessionsNow from './components/focus-sessions-now.vue'
import TimersAndTasks from './components/timers-and-tasks.vue'

const { t } = useI18n()
const { alarms } = useStoredAlarms()
const now = useDisplayClock()
</script>

<template>
  <FocusSessionsNow />
  <AlarmsToday :alarms="alarms" :now="now" />
  <TimersAndTasks :heading="t('today.timersAndTasks')" only-today />
</template>
