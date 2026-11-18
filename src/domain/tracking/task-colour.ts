import { colourValues } from '@/ui/colours'
import type { Timer } from '../timer/model/timer'

/** The colour a task's tracked time is drawn in: the task's own colour, or a neutral one when the task has been removed. */
export function colourOfTask(taskId: string, timers: readonly Timer[]): string {
  const task = timers.find(timer => timer.id === taskId)
  return task ? colourValues[task.appearance.colour] : 'var(--n-text-muted)'
}
