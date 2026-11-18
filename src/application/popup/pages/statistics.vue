<script setup lang="ts">
import type { TaskFilter } from '@/domain/tracking/model/statistics'
import { useKeptTaskFilter } from '../kept-task-filter'
import WeekStatistics from './components/week-statistics.vue'

const route = useRoute()
const router = useRouter()
const filter = useKeptTaskFilter()

watch(() => route.query.task, (task) => {
  if (task !== undefined) {
    filter.value = [task].flat().filter((taskId) => taskId !== null)
    void router.replace({ query: {} })
  }
}, { immediate: true })

function choose(chosen: TaskFilter) {
  filter.value = chosen
}
</script>

<template>
  <WeekStatistics :filter="filter" @update:filter="choose" />
</template>
