<script setup lang="ts">
import TimersAndTasks from './components/timers-and-tasks.vue'

const { t } = useI18n()
</script>

<template>
  <TimersAndTasks :heading="t('timers.allTimersAndTasks')" />
</template>
