import { createMemoryChimer } from '@/infrastructure/memory/chimer'
import { createMemoryRepeatDayResultStore } from '@/infrastructure/memory/repeat-day-result-store'
import { createMemoryRinger } from '@/infrastructure/memory/ringer'
import { createMemorySessionStore } from '@/infrastructure/memory/session-store'
import { createMemoryTimerStore } from '@/infrastructure/memory/timer-store'
import { createMemoryTimersAndSessionsStore } from '@/infrastructure/memory/timers-and-sessions-store'
import { createMemoryToolbarButton } from '@/infrastructure/memory/toolbar-button'
import { createMemoryTrackedTimeStore } from '@/infrastructure/memory/tracked-time-store'
import { createMemoryWakeScheduler } from '@/infrastructure/memory/wake-scheduler'
import { createSessionEngine } from '../session/session-engine'
import { createTimerEngine } from '../timer/timer-engine'
import { localDayOf } from '../tracking/local-day'
import { createCommandQueue } from './command-queue'
import { createCommandRunner } from './command-runner'
import type { ToolbarButton } from './ports'

const MINUTE = 60_000
const NINE = new Date(2026, 10, 17, 9).getTime()

const tea = { id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 3 * MINUTE, appearance: { colour: 'teal' } } as const
const writeReport = { id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'blue' } } as const

/** Write report in two focus steps, 0-25 and 30-55 minutes after the start, with a break between them. */
const morning = { id: 'morning', name: 'Morning', taskIds: ['write-report'], stepLength: 25 * MINUTE, breakLength: 5 * MINUTE, order: 'one after another' } as const

function setup(button?: ToolbarButton) {
  const toolbarButton = createMemoryToolbarButton()
  const run = createCommandRunner({
    inTurn: createCommandQueue(),
    store: createMemoryTimersAndSessionsStore(createMemoryTimerStore(), createMemorySessionStore()),
    trackedTimeStore: createMemoryTrackedTimeStore(),
    repeatDayResultStore: createMemoryRepeatDayResultStore(),
    wakeScheduler: createMemoryWakeScheduler(),
    ringer: createMemoryRinger(),
    chimer: createMemoryChimer(),
    dayOf: localDayOf,
    toolbarButton: button ?? toolbarButton
  })
  return { timers: createTimerEngine(run, localDayOf), sessions: createSessionEngine(run), badge: () => toolbarButton.shown.at(-1), shown: toolbarButton.shown }
}

describe('the toolbar badge after each turn of the command runner', () => {
  test('a started timer shows on the badge', async () => {
    const { timers, badge } = setup()
    await timers.add(tea, NINE)

    await timers.start('tea', NINE)

    expect(badge()).toEqual({ text: '1', look: 'running' })
  })

  test('the wake at the moment a timer ran out takes the badge away', async () => {
    const { timers, sessions, badge } = setup()
    await timers.add(tea, NINE)
    await timers.start('tea', NINE)

    await sessions.settleAll(NINE + 3 * MINUTE)

    expect(badge()).toBeNull()
  })

  test('pausing the last timer that runs takes the badge away', async () => {
    const { timers, badge } = setup()
    await timers.add(tea, NINE)
    await timers.start('tea', NINE)

    await timers.pause('tea', NINE + MINUTE)

    expect(badge()).toBeNull()
  })

  test('the background starting shows the badge for a timer that still runs', async () => {
    const { timers, sessions, shown } = setup()
    await timers.add(tea, NINE)
    await timers.start('tea', NINE)
    const shownBefore = shown.length

    await sessions.settleAllAtStart(NINE + MINUTE)

    expect(shown.slice(shownBefore)).toEqual([{ text: '1', look: 'running' }])
  })

  test('a badge that never finishes showing holds up no command', async () => {
    const { timers } = setup({ showBadge: () => new Promise(() => {}) })
    await timers.add(tea, NINE)

    const refusal = await timers.start('tea', NINE)

    expect(refusal).toBeNull()
  })

  test('the wakes at the ends of a focus step and of its break turn the badge to the break look and back', async () => {
    const { timers, sessions, badge } = setup()
    await timers.add(writeReport, NINE)
    await sessions.add(morning, NINE)
    await sessions.start('morning', NINE)

    await sessions.settleAll(NINE + 25 * MINUTE)
    const inBreak = badge()
    await sessions.settleAll(NINE + 30 * MINUTE)

    expect(inBreak).toEqual({ text: '1', look: 'on break' })
    expect(badge()).toEqual({ text: '1', look: 'running' })
  })
})
