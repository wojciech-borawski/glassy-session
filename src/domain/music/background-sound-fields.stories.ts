import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import FocusSessionDialog from '../session/focus-session-dialog.vue'
import { createFocusSession } from '../session/model/focus-session'
import { createTimer } from '../timer/model/timer'
import TimerDialog from '../timer/timer-dialog.vue'
import BackgroundSoundFields from './background-sound-fields.vue'
import type { BackgroundSound } from './model/background-sound'
import type { Playlist } from './model/playlist'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const playlists: readonly Playlist[] = [
  { id: 'deep-focus', name: 'Deep focus', files: [] },
  { id: 'evening', name: 'Evening', files: [] }
]

const writeReport = createTimer({ id: 'write-report', name: 'Write report', description: 'Chapters 3 to 5', kind: 'task', plannedTime: 90 * MINUTE, appearance: { colour: 'violet' } })
const answerEmail = createTimer({ id: 'answer-email', name: 'Answer email', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'green' } })
const morning = createFocusSession({
  id: 'morning',
  name: 'Morning',
  taskIds: ['write-report', 'answer-email'],
  stepLength: 25 * MINUTE,
  breakLength: 5 * MINUTE,
  order: 'alternating'
}, [{ taskId: 'write-report', remainingTime: 90 * MINUTE }, { taskId: 'answer-email', remainingTime: 30 * MINUTE }])

const meta = {
  title: 'music/background-sound-fields',
  component: BackgroundSoundFields,
  args: { playlists, modelValue: { playlistId: 'deep-focus', volume: 0.3 } },
  render: args => ({
    components: { BackgroundSoundFields },
    setup: () => ({ args }),
    template: '<div style="width: 360px"><BackgroundSoundFields v-bind="args" @update:model-value="args.modelValue = $event" /></div>'
  })
} satisfies Meta<typeof BackgroundSoundFields>

export default meta
type Story = StoryObj<typeof meta>

export const Chosen: Story = {}

export const NoneChosen: Story = {
  args: { modelValue: { playlistId: null, volume: 0.5 } }
}

export const NoPlaylistsYet: Story = {
  args: { playlists: [], modelValue: { playlistId: null, volume: 0.5 } }
}

/** The fields where the person meets them: in the dialog of a task being edited. */
export const InTimerDialog: Story = {
  render: () => ({
    components: { TimerDialog, BackgroundSoundFields },
    setup: () => ({ playlists, writeReport, sound: ref<BackgroundSound>({ playlistId: 'deep-focus', volume: 0.3 }) }),
    template: `
      <div style="position: relative; width: 420px; height: 760px">
        <TimerDialog :open="true" :timer="writeReport">
          <template #sound>
            <BackgroundSoundFields v-model="sound" :playlists="playlists" />
          </template>
        </TimerDialog>
      </div>
    `
  })
}

/** The fields in the dialog of a focus session being edited. */
export const InFocusSessionDialog: Story = {
  render: () => ({
    components: { FocusSessionDialog, BackgroundSoundFields },
    setup: () => ({ playlists, morning, tasks: [writeReport, answerEmail], now: NINE, sound: ref<BackgroundSound>({ playlistId: 'evening', volume: 0.6 }) }),
    template: `
      <div style="position: relative; width: 480px; height: 720px">
        <FocusSessionDialog :open="true" :session="morning" :tasks="tasks" :now="now">
          <template #sound>
            <BackgroundSoundFields v-model="sound" :playlists="playlists" />
          </template>
        </FocusSessionDialog>
      </div>
    `
  })
}
