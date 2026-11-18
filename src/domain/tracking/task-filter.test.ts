import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import { createTimer } from '../timer/model/timer'
import TaskFilter from './task-filter.vue'

const MINUTE = 60_000

const gym = createTimer({ id: 'gym', name: 'Gym', kind: 'task', plannedTime: 60 * MINUTE, appearance: { colour: 'green' } })
const readMail = createTimer({ id: 'read-mail', name: 'Read mail', kind: 'task', plannedTime: 15 * MINUTE, appearance: { colour: 'blue' } })

const choices = [
  { taskId: 'gym', name: 'Gym' },
  { taskId: 'read-mail', name: 'Read mail' },
  { taskId: 'old-task', name: null }
]

function renderFilter(modelValue: readonly string[] = []) {
  return render(TaskFilter, { props: { choices, modelValue, timers: [gym, readMail] }, global: { plugins: [createAppI18n()] } })
}

describe('the task filter', () => {
  test('offers all tasks and each task, a removed one as Removed task, and shows which are chosen', () => {
    renderFilter(['gym'])

    const group = screen.getByRole('group', { name: 'Tasks shown' })
    const buttons = within(group).getAllByRole('button')
    expect(buttons.map((button) => [button.textContent?.trim(), button.getAttribute('aria-pressed')])).toEqual([
      ['All tasks', 'false'],
      ['Gym', 'true'],
      ['Read mail', 'false'],
      ['Removed task', 'false']
    ])
  })

  test('numbers removed tasks when there are several, so each has a name of its own', () => {
    render(TaskFilter, { props: { choices: [...choices, { taskId: 'older-task', name: null }], modelValue: [], timers: [gym, readMail] }, global: { plugins: [createAppI18n()] } })

    expect(screen.getByRole('button', { name: 'Removed task 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Removed task 2' })).toBeInTheDocument()
  })

  test('choosing a task adds it to the chosen ones, and choosing a chosen task again takes it out', async () => {
    const { emitted } = renderFilter(['gym'])

    await userEvent.click(screen.getByRole('button', { name: 'Read mail' }))
    await userEvent.click(screen.getByRole('button', { name: 'Gym' }))

    expect(emitted('update:modelValue')).toEqual([[['gym', 'read-mail']], [[]]])
  })

  test('choosing all tasks chooses no task in particular', async () => {
    const { emitted } = renderFilter(['gym', 'old-task'])

    await userEvent.click(screen.getByRole('button', { name: 'All tasks' }))

    expect(emitted('update:modelValue')).toEqual([[[]]])
  })
})
