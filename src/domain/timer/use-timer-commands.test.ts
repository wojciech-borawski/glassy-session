import { render, screen } from '@testing-library/vue'
import { defineComponent, h, shallowRef } from 'vue'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { createMemoryStoredTimers } from '@/infrastructure/memory/stored-timers'
import NSnackbar from '@/ui/n-snackbar/index.vue'
import { provideSnackbar } from '@/ui/n-snackbar/snackbar'
import type { Refusal } from '../command/command-outcome'
import { createTimer, isPinned, markDone, remainingTimeAt, runStateAt, type Timer } from './model/timer'
import type { StoredTimers } from './ports'
import { provideStoredTimers } from './stored-timers'
import { useTimerCommands } from './use-timer-commands'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

type TimerCommands = ReturnType<typeof useTimerCommands>

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 90 * MINUTE, appearance: { colour: 'blue' } })

function renderCommands(storedTimers: StoredTimers) {
  let commands: TimerCommands | undefined
  const Uses = defineComponent({
    setup() {
      commands = useTimerCommands()
      return () => null
    }
  })
  render(defineComponent({
    setup() {
      provideStoredTimers(storedTimers)
      const { messages } = provideSnackbar()
      return () => [h(NSnackbar, { messages: messages.value }), h(Uses)]
    }
  }), { global: { plugins: [createAppI18n()] } })
  if (commands === undefined) throw new Error('not rendered')
  return commands
}

describe('the timer commands a view sends', () => {
  test('start a stored timer and say so in the snackbar', async () => {
    const storedTimers = createMemoryStoredTimers({ now: () => NINE, timers: [writeReport] })
    const commands = renderCommands(storedTimers)

    await commands.start(writeReport)

    expect(runStateAt(storedTimers.timers.value[0] as Timer, NINE + MINUTE)).toBe('running')
    expect(await screen.findByRole('status')).toHaveTextContent('Write report started')
  })

  const running = { ...writeReport, remainingTime: 60 * MINUTE, runningSince: NINE - MINUTE }

  test.each([
    { does: 'pause a running timer', run: (commands: TimerCommands) => commands.pause(running), says: 'Write report paused', leaves: (timers: readonly Timer[]) => runStateAt(timers[0] as Timer, NINE) === 'paused' },
    { does: 'reset a timer', run: (commands: TimerCommands) => commands.reset(running), says: 'Write report reset', leaves: (timers: readonly Timer[]) => runStateAt(timers[0] as Timer, NINE) === 'idle' },
    { does: 'remove a timer', run: (commands: TimerCommands) => commands.remove(running), says: 'Write report removed', leaves: (timers: readonly Timer[]) => timers.length === 0 },
    { does: 'pin a timer', run: (commands: TimerCommands) => commands.pin(running), says: 'Write report pinned to the overlay', leaves: (timers: readonly Timer[]) => isPinned(timers[0] as Timer) },
    { does: 'unpin a timer', run: (commands: TimerCommands) => commands.unpin(running), says: 'Write report unpinned from the overlay', leaves: (timers: readonly Timer[]) => !isPinned(timers[0] as Timer) && timers[0]?.pinned === false },
    { does: 'mark a task done', run: (commands: TimerCommands) => commands.markDone(running), says: 'Write report marked done', leaves: (timers: readonly Timer[]) => runStateAt(timers[0] as Timer, NINE) === 'finished' },
    {
      does: 'save new details of a timer',
      run: (commands: TimerCommands) => commands.change(running, { name: 'Write summary', plannedTime: 90 * MINUTE, appearance: { colour: 'pink' } }),
      says: 'Write summary saved',
      leaves: (timers: readonly Timer[]) => timers[0]?.name === 'Write summary'
    },
    {
      does: 'add a timer',
      run: (commands: TimerCommands) => commands.add('timer', { name: 'Tea', plannedTime: 4 * MINUTE, appearance: { colour: 'gold' } }),
      says: 'Tea added',
      leaves: (timers: readonly Timer[]) => timers[1]?.name === 'Tea' && timers[1].kind === 'timer' && timers[1].id !== ''
    }
  ])('$does and say so in the snackbar', async ({ run, says, leaves }) => {
    const storedTimers = createMemoryStoredTimers({ now: () => NINE, timers: [running] })

    expect(await run(renderCommands(storedTimers))).toBeNull()

    expect(leaves(storedTimers.timers.value)).toBe(true)
    expect(await screen.findByRole('status')).toHaveTextContent(says)
  })

  test('undo done for a done task and say so in the snackbar', async () => {
    const doneReport = markDone(writeReport, NINE).timer
    const storedTimers = createMemoryStoredTimers({ now: () => NINE + MINUTE, timers: [doneReport] })

    expect(await renderCommands(storedTimers).undoDone(doneReport)).toBeNull()

    expect(remainingTimeAt(storedTimers.timers.value[0] as Timer, NINE + MINUTE)).toBe(90 * MINUTE)
    expect(await screen.findByRole('status')).toHaveTextContent('Write report is no longer done')
  })

  test.each([
    { refusal: { reason: 'task in use', task: { id: 'write-report', name: 'Write report' }, usedIn: { id: 'morning', name: 'Morning' } }, says: 'Write report is in Morning' },
    { refusal: { reason: 'task in use', task: { id: 'write-report', name: 'Write report' }, usedIn: null }, says: 'Write report is already running on its own' },
    { refusal: { reason: 'failed', message: 'Storage is full' }, says: 'That did not work: Storage is full' },
    { refusal: { reason: 'already removed' }, says: 'It was already removed' }
  ] satisfies { refusal: Refusal, says: string }[])('say why a refused command changed nothing: $says', async ({ refusal, says }) => {
    const refusing: StoredTimers = { timers: shallowRef([writeReport]), send: async () => refusal }

    expect(await renderCommands(refusing).start(writeReport)).toEqual(refusal)

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent(says)
    expect(status).not.toHaveTextContent('started')
  })
})
