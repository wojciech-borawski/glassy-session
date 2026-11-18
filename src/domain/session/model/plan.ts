import type { Duration } from '@/utils/time/units'

export type TaskTime = Readonly<{ taskId: string, remainingTime: Duration }>

export type Order = 'one after another' | 'alternating'

export type FocusStep = Readonly<{ taskId: string, length: Duration }>

export type Plan = readonly FocusStep[]

function stepsOf({ taskId, remainingTime }: TaskTime, stepLength: Duration): FocusStep[] {
  const steps: FocusStep[] = []
  for (let left = remainingTime; left > 0; left -= stepLength) {
    steps.push({ taskId, length: Math.min(left, stepLength) })
  }
  return steps
}

function takingTurns(stepsPerTask: FocusStep[][]): FocusStep[] {
  const longest = Math.max(0, ...stepsPerTask.map((steps) => steps.length))
  return Array.from({ length: longest }, (_, turn) => stepsPerTask.flatMap((steps) => steps[turn] ?? [])).flat()
}

export function buildPlan(tasks: readonly TaskTime[], stepLength: Duration, order: Order): Plan {
  const stepsPerTask = tasks.map((task) => stepsOf(task, stepLength))
  return order === 'alternating' ? takingTurns(stepsPerTask) : stepsPerTask.flat()
}

export function fitPlan(plan: Plan, tasks: readonly TaskTime[]): Plan {
  const left = new Map(tasks.map(({ taskId, remainingTime }) => [taskId, remainingTime]))
  return plan.flatMap(({ taskId, length }) => {
    const taskLeft = left.get(taskId) ?? 0
    const fittedLength = Math.min(length, taskLeft)
    left.set(taskId, taskLeft - fittedLength)
    return fittedLength > 0 ? [{ taskId, length: fittedLength }] : []
  })
}

export function withStepMoved(plan: Plan, firstMovable: number, from: number, to: number): Plan {
  const isMovable = (step: number) => Number.isInteger(step) && step >= firstMovable && step < plan.length
  if (!isMovable(from) || !isMovable(to)) {
    return plan
  }
  const changed = [...plan]
  changed.splice(to, 0, ...changed.splice(from, 1))
  return changed
}

export function withTaskAdded(plan: Plan, task: TaskTime, stepLength: Duration): Plan {
  if (plan.some(({ taskId }) => taskId === task.taskId)) {
    return plan
  }
  return [...plan, ...stepsOf(task, stepLength)]
}
