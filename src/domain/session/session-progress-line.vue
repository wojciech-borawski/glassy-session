<script setup lang="ts">
import { colourValues } from '@/ui/colours'
import { clampFraction } from '@/ui/fraction'
import NProgressLine from '@/ui/n-progress-line/index.vue'
import type { Timer } from '../timer/model/timer'
import type { Progress } from './model/focus-session'

const props = defineProps<{
  label: string
  progressLine: Progress['progressLine']
  tasks: readonly Timer[]
}>()

const BREAK_COLOUR = 'var(--n-text-muted)'

const segments = computed(() => {
  let from = 0
  return props.progressLine.parts.map((part) => {
    const fill = clampFraction((props.progressLine.filled - from) / part.length)
    from += part.length
    const task = part.kind === 'focus step' ? props.tasks.find(({ id }) => id === part.taskId) : undefined
    return { length: part.length, fill, color: task === undefined ? BREAK_COLOUR : colourValues[task.appearance.colour] }
  })
})
</script>

<template>
  <NProgressLine :label="label" :segments="segments" />
</template>
