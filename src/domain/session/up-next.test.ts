import { fireEvent, render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { createTimer, type Timer } from '../timer/model/timer'
import type { UpNextStep } from './model/focus-session'
import UpNext from './up-next.vue'

const MINUTE = 60_000

const writeReport = createTimer({ id: 'write-report', name: 'Write report', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'blue' } })
const answerEmail = createTimer({ id: 'answer-email', name: 'Answer email', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' } })
const planWeek = createTimer({ id: 'plan-week', name: 'Plan the week', kind: 'task', plannedTime: 20 * MINUTE, appearance: { colour: 'violet' } })

const steps: readonly UpNextStep[] = [
  { step: 1, taskId: 'write-report', length: 25 * MINUTE },
  { step: 2, taskId: 'answer-email', length: 25 * MINUTE },
  { step: 3, taskId: 'answer-email', length: 5 * MINUTE }
]

function renderUpNext(shown: readonly UpNextStep[] = steps, addable: readonly Timer[] = [planWeek]) {
  return render(UpNext, { props: { steps: shown, tasks: [writeReport, answerEmail, planWeek], addable }, global: { plugins: [createAppI18n()] } })
}

const rows = () => within(screen.getByRole('list', { name: 'Up next' })).getAllByRole('listitem')

describe('up next', () => {
  test('lists the steps after the current one in order, each with its number in the plan, its task and its length', () => {
    renderUpNext()

    expect(rows().map((row) => within(row).getAllByText(/./).map((part) => part.textContent))).toEqual([
      ['2', 'Write report', '25m'],
      ['3', 'Answer email', '25m'],
      ['4', 'Answer email', '5m']
    ])
  })

  test('moves a step one place earlier or later, or sends it to the front, with buttons that name the step, and offers no move past either end', async () => {
    const { emitted } = renderUpNext()

    await userEvent.click(screen.getByRole('button', { name: 'Move step 3, Answer email, earlier' }))
    await userEvent.click(screen.getByRole('button', { name: 'Move step 2, Write report, later' }))
    await userEvent.click(screen.getByRole('button', { name: 'Send step 4, Answer email, to the front' }))

    expect(emitted('move')).toEqual([[2, 1], [1, 2]])
    expect(emitted('sendToFront')).toEqual([[3]])
    expect(screen.getByRole('button', { name: 'Move step 2, Write report, earlier' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Send step 2, Write report, to the front' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move step 4, Answer email, later' })).toBeDisabled()
  })

  test('keeps focus on the step that was moved once up next has changed, on its other move button when the first can no longer move it', async () => {
    const { rerender } = renderUpNext()
    const press = async (name: string) => {
      screen.getByRole('button', { name }).focus()
      await userEvent.keyboard('{Enter}')
    }

    await press('Move step 4, Answer email, earlier')
    await rerender({ steps: [steps[0], { ...steps[2]!, step: 2 }, { ...steps[1]!, step: 3 }] })
    expect(screen.getByRole('button', { name: 'Move step 3, Answer email, earlier' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await rerender({ steps: [{ ...steps[2]!, step: 1 }, { ...steps[0]!, step: 2 }, { ...steps[1]!, step: 3 }] })

    expect(screen.getByRole('button', { name: 'Move step 2, Answer email, later' })).toHaveFocus()
  })

  test('moves a step dragged onto another step to the place of that step', async () => {
    const { emitted } = renderUpNext()
    const [first, , last] = rows() as [HTMLElement, HTMLElement, HTMLElement]

    await fireEvent.dragStart(last)
    await fireEvent.dragOver(first)
    await fireEvent.drop(first)

    expect(emitted('move')).toEqual([[3, 1]])
  })

  test('moves nothing when a drag ends without a drop, as when it is let go outside up next or Escape cancels it', async () => {
    const { emitted } = renderUpNext()
    const [first, , last] = rows() as [HTMLElement, HTMLElement, HTMLElement]

    await fireEvent.dragStart(last)
    await fireEvent.dragEnd(last)
    await fireEvent.dragOver(first)
    await fireEvent.drop(first)

    expect(emitted('move')).toBeUndefined()
  })

  test('moves nothing when a step is dropped onto itself', async () => {
    const { emitted } = renderUpNext()
    const [, middle] = rows() as [HTMLElement, HTMLElement, HTMLElement]

    await fireEvent.dragStart(middle)
    await fireEvent.drop(middle)

    expect(emitted('move')).toBeUndefined()
  })

  test('moves nothing when the dragged step has left up next before the drop, because its focus step has started', async () => {
    const { emitted, rerender } = renderUpNext()
    const [first] = rows() as [HTMLElement]

    await fireEvent.dragStart(first)
    await rerender({ steps: steps.slice(1) })
    await fireEvent.drop(rows()[1] as HTMLElement)

    expect(emitted('move')).toBeUndefined()
  })

  test('marks the task of a step done with a button on the first step of each task, which names the task', async () => {
    const { emitted } = renderUpNext()

    await userEvent.click(screen.getByRole('button', { name: 'Mark Answer email done' }))

    expect(emitted('markDone')).toEqual([[answerEmail]])
    expect(rows().map((row) => within(row).queryByRole('button', { name: /^Mark / }) !== null)).toEqual([true, true, false])
  })

  test('says there are no more steps when the current one is the last', () => {
    renderUpNext([])

    expect(screen.getByText('No more steps after this one.')).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  test('adds the steps of the task chosen from those that can still be added, and offers nothing to add when there are none', async () => {
    const tidyDesk = createTimer({ id: 'tidy-desk', name: 'Tidy desk', kind: 'task', plannedTime: 10 * MINUTE, appearance: { colour: 'teal' } })
    const { emitted } = renderUpNext(steps, [planWeek, tidyDesk])

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Task to add' }), 'Tidy desk')
    await userEvent.click(screen.getByRole('button', { name: 'Add its steps' }))

    expect(emitted('add')).toEqual([[tidyDesk]])
    renderUpNext(steps, [])
    expect(screen.getAllByRole('combobox')).toHaveLength(1)
  })
})
