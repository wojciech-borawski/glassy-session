<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import NSwatch from '@/ui/n-swatch/index.vue'
import { formatCountdown } from '@/utils/time/format-duration'
import type { Moment } from '@/utils/time/units'
import { remainingTimeAt, runStateAt, type Timer } from './model/timer'

const props = defineProps<{
  timers: readonly Timer[]
  now: Moment
}>()

const emit = defineEmits<{
  pause: [timer: Timer]
}>()

/** List items to show before the running timers, such as running focus sessions. */
/** `sound` holds the background sound controls of each running timer. */
const slots = defineSlots<{ before?: () => unknown, sound?: (props: { timer: Timer }) => unknown }>()

const { t } = useI18n()

const running = computed(() => props.timers.filter((timer) => runStateAt(timer, props.now) === 'running'))

const LINE = 16

/** Turns a wheel turned up or down into scrolling the chips sideways, while they do not fit. */
function scrollSideways(event: WheelEvent): void {
  const chips = event.currentTarget as HTMLElement
  if (chips.scrollWidth > chips.clientWidth && Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
    event.preventDefault()
    chips.scrollLeft += event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * LINE : event.deltaY
  }
}
</script>

<template>
  <section v-if="running.length > 0 || slots.before" class="running-bar" :aria-label="t('runningBar.label')">
    <ul class="running-bar__chips" @wheel="scrollSideways">
      <slot name="before" />
      <li v-for="timer in running" :key="timer.id" class="running-bar__chip">
        <NSwatch :colour="timer.appearance.colour" size="dot" />
        <b class="running-bar__name">{{ timer.name }}</b>
        <span class="running-bar__remaining">{{ formatCountdown(remainingTimeAt(timer, now)) }}</span>
        <slot name="sound" :timer="timer" />
        <NButton class="running-bar__pause" icon="pause" :label="t('timer.action.pause', { name: timer.name })" @click="emit('pause', timer)" />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.running-bar {
  padding: 8px 14px;
  border-top: 1px solid var(--n-line);
}

.running-bar__chips {
  display: flex;
  gap: 8px;
  margin: 0;
  padding: 0;
  overflow-x: auto;
  list-style: none;
  scrollbar-width: none;
}

.running-bar__chips::-webkit-scrollbar {
  display: none;
}

.running-bar__chip {
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

.running-bar__name {
  max-width: 120px;
  overflow: hidden;
  font-weight: var(--n-font-weight-strong);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.running-bar__remaining {
  font-variant-numeric: tabular-nums;
}

.running-bar__chip .running-bar__pause {
  min-height: 24px;
  padding: 3px 6px;
  border-radius: 999px;
}
</style>
