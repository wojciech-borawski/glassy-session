<script setup lang="ts">
import type { Moment } from '@/utils/time/units'
import type { Timer } from '../timer/model/timer'
import { progressAt, upNextAt, type FocusSession } from './model/focus-session'

const props = defineProps<{
  session: FocusSession
  tasks: readonly Timer[]
  now: Moment
}>()

const { t } = useI18n()

const nameOf = (taskId: string | undefined) => props.tasks.find(({ id }) => id === taskId)?.name ?? ''
const nowLine = computed(() => {
  const now = progressAt(props.session, props.now)
  const currentTask = () => nameOf(props.session.run?.plan[now.currentStep ?? -1]?.taskId)
  const nextTask = () => nameOf(upNextAt(props.session, props.now)[0]?.taskId)
  if (now.state === 'paused') {
    return now.pausedIn === 'break'
      ? t('focusSession.now.pausedInBreak', { task: nextTask() })
      : t('focusSession.now.pausedInFocusStep', { task: currentTask() })
  }
  return now.state === 'break' ? t('focusSession.now.break', { task: nextTask() }) : t('focusSession.now.focusStep', { task: currentTask() })
})
</script>

<template>
  <p class="session-now-line">{{ nowLine }}</p>
</template>

<style scoped>
.session-now-line {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 11.5px;
  overflow-wrap: anywhere;
}
</style>
