<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import NIcon from '@/ui/n-icon/index.vue'
import { formatCountdown } from '@/utils/time/format-duration'
import type { Moment } from '@/utils/time/units'
import { isCountingDownAt, progressAt, type FocusSession } from './model/focus-session'

const props = defineProps<{
  sessions: readonly FocusSession[]
  now: Moment
}>()

const emit = defineEmits<{
  pause: [session: FocusSession]
}>()

/** `sound` holds the background sound controls of each running focus session. */
defineSlots<{ sound?: (props: { session: FocusSession }) => unknown }>()

const { t } = useI18n()

const running = computed(() => props.sessions
  .filter((session) => isCountingDownAt(session, props.now))
  .map((session) => ({ session, remainingTime: progressAt(session, props.now).remainingTime ?? 0 })))
</script>

<template>
  <li v-for="{ session, remainingTime } in running" :key="session.id" class="running-session-chip">
    <NIcon name="target" />
    <b class="running-session-chip__name">{{ session.name }}</b>
    <span class="running-session-chip__remaining">{{ formatCountdown(remainingTime) }}</span>
    <slot name="sound" :session="session" />
    <NButton class="running-session-chip__pause" icon="pause" :label="t('focusSession.action.pause', { name: session.name })" @click="emit('pause', session)" />
  </li>
</template>

<style scoped>
.running-session-chip {
  display: flex;
  flex: none;
  align-items: center;
  gap: 7px;
  padding: 3px 4px 3px 10px;
  border: 1px solid var(--n-line);
  border-radius: 999px;
  background: var(--n-surface);
  font-size: 12px;
}

.running-session-chip__name {
  max-width: 120px;
  overflow: hidden;
  font-weight: var(--n-font-weight-strong);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.running-session-chip__remaining {
  font-variant-numeric: tabular-nums;
}

.running-session-chip .running-session-chip__pause {
  min-height: 24px;
  padding: 3px 6px;
  border-radius: 999px;
}
</style>
