import { render, screen } from '@testing-library/vue'
import { defineComponent, h, shallowRef } from 'vue'
import { createMemoryBackground, type MemoryBackground } from '@/infrastructure/memory/background'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import NSnackbar from '@/ui/n-snackbar/index.vue'
import { provideSnackbar } from '@/ui/n-snackbar/snackbar'
import type { Refusal } from '../command/command-outcome'
import { createTimer } from '../timer/model/timer'
import { provideStoredTimers } from '../timer/stored-timers'
import { createFocusSession, pause, progressAt, start, type FocusSession } from './model/focus-session'
import type { StoredSessions } from './ports'
import { provideStoredSessions } from './stored-sessions'
import { useSessionCommands } from './use-session-commands'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

type SessionCommands = ReturnType<typeof useSessionCommands>

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'blue' } })
const answerEmail = createTimer({ id: 'answer-email', name: 'Answer email', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' } })

const morningSettings = {
  name: 'Morning',
  taskIds: ['write-report'],
  stepLength: 25 * MINUTE,
  breakLength: 5 * MINUTE,
  order: 'one after another'
} as const

const morning = createFocusSession({ id: 'morning', ...morningSettings }, [{ taskId: 'write-report', remainingTime: 50 * MINUTE }])

function renderCommands(background: MemoryBackground) {
  let commands: SessionCommands | undefined
  const Uses = defineComponent({
    setup() {
      commands = useSessionCommands()
      return () => null
    }
  })
  render(defineComponent({
    setup() {
      provideStoredTimers(background.storedTimers)
      provideStoredSessions(background.storedSessions)
      const { messages } = provideSnackbar()
      return () => [h(NSnackbar, { messages: messages.value }), h(Uses)]
    }
  }), { global: { plugins: [createAppI18n()] } })
  if (commands === undefined) throw new Error('not rendered')
  return commands
}

const storedSession = (background: MemoryBackground) => background.storedSessions.sessions.value[0] as FocusSession

describe('the focus session commands a view sends', () => {
  test('start a stored focus session and say so in the snackbar', async () => {
    const background = createMemoryBackground({ now: () => NINE, timers: [writeReport, answerEmail], sessions: [morning] })
    const commands = renderCommands(background)

    expect(await commands.start(morning)).toBeNull()

    expect(progressAt(storedSession(background), NINE + MINUTE).state).toBe('focus step')
    expect(await screen.findByRole('status')).toHaveTextContent('Morning started')
  })

  const tasks = [{ taskId: 'write-report', remainingTime: 50 * MINUTE }]
  const startedAgo = (ago: number) => start(morning, tasks, NINE - ago).session
  const running = startedAgo(10 * MINUTE)
  const paused = pause(running, NINE - 5 * MINUTE).session
  const inBreak = startedAgo(27 * MINUTE)

  test.each([
    { does: 'pause a running focus session', from: running, run: (commands: SessionCommands) => commands.pause(running), says: 'Morning paused', state: 'paused' },
    { does: 'resume a paused focus session', from: paused, run: (commands: SessionCommands) => commands.resume(paused), says: 'Morning resumed', state: 'focus step' },
    { does: 'skip a break', from: inBreak, run: (commands: SessionCommands) => commands.skip(inBreak), says: 'Break skipped in Morning', state: 'focus step' },
    { does: 'end a focus session early', from: running, run: (commands: SessionCommands) => commands.endEarly(running), says: 'Morning ended early', state: 'idle' }
  ])('$does and say so in the snackbar', async ({ from, run, says, state }) => {
    const background = createMemoryBackground({ now: () => NINE, timers: [writeReport, answerEmail], sessions: [from] })

    expect(await run(renderCommands(background))).toBeNull()

    expect(progressAt(storedSession(background), NINE).state).toBe(state)
    expect(await screen.findByRole('status')).toHaveTextContent(says)
  })

  test.each([
    { does: 'pin a running focus session', run: (commands: SessionCommands) => commands.pin(running), says: 'Morning pinned to the overlay', pinned: true },
    { does: 'unpin a focus session', run: (commands: SessionCommands) => commands.unpin(running), says: 'Morning unpinned from the overlay', pinned: false }
  ])('$does and say so in the snackbar', async ({ run, says, pinned }) => {
    const background = createMemoryBackground({ now: () => NINE, timers: [writeReport, answerEmail], sessions: [running] })

    expect(await run(renderCommands(background))).toBeNull()

    expect(storedSession(background).pinned).toBe(pinned)
    expect(progressAt(storedSession(background), NINE).state).toBe('focus step')
    expect(await screen.findByRole('status')).toHaveTextContent(says)
  })

  test.each([
    {
      does: 'add a focus session built from stored tasks',
      run: (commands: SessionCommands) => commands.add({ ...morningSettings, name: 'Afternoon', taskIds: ['answer-email', 'write-report'] }),
      says: 'Afternoon added',
      leaves: (sessions: readonly FocusSession[]) => sessions[1]?.name === 'Afternoon' && sessions[1].id !== '' && sessions[1].id !== 'morning' && sessions[1].taskIds.join() === 'answer-email,write-report'
    },
    {
      does: 'save new settings of a focus session',
      run: (commands: SessionCommands) => commands.change(morning, { ...morningSettings, name: 'Early morning', breakLength: 0 }),
      says: 'Early morning saved',
      leaves: (sessions: readonly FocusSession[]) => sessions[0]?.name === 'Early morning' && sessions[0].breakLength === 0
    },
    { does: 'remove a focus session', run: (commands: SessionCommands) => commands.remove(morning), says: 'Morning removed', leaves: (sessions: readonly FocusSession[]) => sessions.length === 0 }
  ])('$does and say so in the snackbar', async ({ run, says, leaves }) => {
    const background = createMemoryBackground({ now: () => NINE, timers: [writeReport, answerEmail], sessions: [morning] })

    expect(await run(renderCommands(background))).toBeNull()

    expect(leaves(background.storedSessions.sessions.value)).toBe(true)
    expect(await screen.findByRole('status')).toHaveTextContent(says)
  })

  const bothTasks = [{ taskId: 'write-report', remainingTime: 50 * MINUTE }, { taskId: 'answer-email', remainingTime: 30 * MINUTE }]
  const twoTasksRunning = start(createFocusSession({ id: 'morning', ...morningSettings, taskIds: ['write-report', 'answer-email'] }, bothTasks), bothTasks, NINE - MINUTE).session
  const runPlan = (sessions: readonly FocusSession[]) => sessions[0]?.run?.plan.map(({ taskId, length }) => `${taskId} ${length / MINUTE}`)

  test.each([
    {
      does: 'move a step in up next',
      from: twoTasksRunning,
      run: (commands: SessionCommands) => commands.moveStep(twoTasksRunning, 3, 1),
      says: 'Answer email moved. Changed for this run only.',
      plan: ['write-report 25', 'answer-email 5', 'write-report 25', 'answer-email 25']
    },
    {
      does: 'send a step to the front of up next',
      from: twoTasksRunning,
      run: (commands: SessionCommands) => commands.sendToFront(twoTasksRunning, 2),
      says: 'Answer email sent to the front. Changed for this run only.',
      plan: ['write-report 25', 'answer-email 25', 'write-report 25', 'answer-email 5']
    },
    {
      does: 'add the steps of a task to up next',
      from: running,
      run: (commands: SessionCommands) => commands.addTaskSteps(running, answerEmail),
      says: 'Answer email added to Morning. Changed for this run only.',
      plan: ['write-report 25', 'write-report 25', 'answer-email 25', 'answer-email 5']
    },
    {
      does: 'mark a task done from up next',
      from: twoTasksRunning,
      run: (commands: SessionCommands) => commands.markTaskDone(twoTasksRunning, answerEmail),
      says: 'Answer email done; its steps are taken out of this run',
      plan: ['write-report 25', 'write-report 25']
    }
  ])('$does and say in the snackbar what changed in this run', async ({ from, run, says, plan }) => {
    const background = createMemoryBackground({ now: () => NINE, timers: [writeReport, answerEmail], sessions: [from] })

    expect(await run(renderCommands(background))).toBeNull()

    expect(runPlan(background.storedSessions.sessions.value)).toEqual(plan)
    expect(await screen.findByRole('status')).toHaveTextContent(says)
  })

  test('say why moving a step that has become the current step changed nothing', async () => {
    const secondStepCurrent = start(createFocusSession({ id: 'morning', ...morningSettings, taskIds: ['write-report', 'answer-email'] }, bothTasks), bothTasks, NINE - 31 * MINUTE).session
    const background = createMemoryBackground({ now: () => NINE, timers: [writeReport, answerEmail], sessions: [secondStepCurrent] })

    expect(await renderCommands(background).moveStep(secondStepCurrent, 1, 3)).toMatchObject({ reason: 'not up next', step: 1 })

    expect(runPlan(background.storedSessions.sessions.value)).toEqual(runPlan([secondStepCurrent]))
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Step 2, Write report, is no longer up next')
    expect(status).not.toHaveTextContent('moved')
  })

  test('say that the run has ended when a step is moved in up next of a session whose run ended meanwhile', async () => {
    const ended = start(createFocusSession({ id: 'morning', ...morningSettings, taskIds: ['write-report', 'answer-email'] }, bothTasks), bothTasks, NINE - 180 * MINUTE).session
    const background = createMemoryBackground({ now: () => NINE, timers: [writeReport, answerEmail], sessions: [ended] })

    expect(await renderCommands(background).moveStep(ended, 2, 3)).toEqual({ reason: 'run ended' })

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('The run has ended')
    expect(status).not.toHaveTextContent('moved')
  })

  test.each([
    { refusal: { reason: 'task in use', task: { id: 'write-report', name: 'Write report' }, usedIn: { id: 'evening', name: 'Evening' } }, says: 'Write report is in Evening' },
    { refusal: { reason: 'task in use', task: { id: 'write-report', name: 'Write report' }, usedIn: null }, says: 'Write report is already running on its own' },
    { refusal: { reason: 'failed', message: 'Storage is full' }, says: 'That did not work: Storage is full' }
  ] satisfies { refusal: Refusal, says: string }[])('say why a refused command changed nothing: $says', async ({ refusal, says }) => {
    const background = createMemoryBackground({ now: () => NINE, timers: [writeReport] })
    const refusing: StoredSessions = { sessions: shallowRef([morning]), send: async () => refusal }

    expect(await renderCommands({ ...background, storedSessions: refusing }).start(morning)).toEqual(refusal)

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent(says)
    expect(status).not.toHaveTextContent('started')
  })
})
