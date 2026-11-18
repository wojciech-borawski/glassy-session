<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import { formatDays } from '@/utils/time/format-day'
import type { DayRange } from './model/statistics'

const props = defineProps<{
  week: DayRange
  canGoBack: boolean
  canGoForward: boolean
}>()

defineEmits<{
  back: []
  forward: []
}>()

const { t, locale } = useI18n()

const name = computed(() => formatDays(props.week.first, props.week.last, locale.value, { day: 'numeric', month: 'short', year: 'numeric' }))
</script>

<template>
  <div class="week-switcher">
    <NButton icon="chevron-left" :disabled="!canGoBack" :label="t('weekSwitcher.before')" @click="$emit('back')" />
    <h2 class="week-switcher__name">{{ name }}</h2>
    <NButton icon="chevron-right" :disabled="!canGoForward" :label="t('weekSwitcher.after')" @click="$emit('forward')" />
  </div>
</template>

<style scoped>
.week-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
}

.week-switcher__name {
  flex: 1;
  margin: 0;
  font-size: 14px;
  font-weight: var(--n-font-weight-strong);
  text-align: center;
}
</style>
