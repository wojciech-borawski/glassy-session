import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { defineComponent, h, type PropType } from 'vue'
import { createAlarm, switchOff } from '@/domain/alarm/model/alarm'
import { provideStoredAlarms } from '@/domain/alarm/stored-alarms'
import { provideDisplayClock } from '@/domain/display-clock'
import type { Playback } from '@/domain/music/model/playback'
import { provideStoredPlaylists } from '@/domain/music/stored-playlists'
import { provideStoredOverlaySettings } from '@/domain/overlay/stored-overlay-settings'
import { createFocusSession, start as startSession, taskTimesAt } from '@/domain/session/model/focus-session'
import { provideStoredSessions } from '@/domain/session/stored-sessions'
import { createTimer, markDone, pause, start } from '@/domain/timer/model/timer'
import { provideStoredTimers } from '@/domain/timer/stored-timers'
import { provideStoredTrackedTime } from '@/domain/tracking/stored-tracked-time'
import { createMemoryBackground } from '@/infrastructure/memory/background'
import { createFixedVersion } from '@/infrastructure/memory/extension-version'
import { createManualClock } from '@/infrastructure/memory/display-clock'
import { createMemoryOverlaySettings } from '@/infrastructure/memory/overlay-settings'
import { createMemoryStoredAlarms } from '@/infrastructure/memory/stored-alarms'
import { provideSnackbar } from '@/ui/n-snackbar/snackbar'
import NTheme from '@/ui/n-theme/index.vue'
import { themeNames, type ThemeName, type ThemeVersion, type ThemeVersionChoice } from '@/ui/n-theme/themes'
import { provideExtensionVersion } from './extension-version'
import PopupShell from './popup-shell.vue'
import { provideThemeChoice } from './theme-choice'

const MINUTE = 60_000
const NINE = Date.UTC(2026, 10, 17, 9)

const writeReport = createTimer({ id: 'write-report', name: 'Write report', description: 'Chapters 3 to 5', kind: 'task', plannedTime: 90 * MINUTE, appearance: { colour: 'blue' } })
const readMail = createTimer({ id: 'read-mail', name: 'Read mail', kind: 'task', plannedTime: 15 * MINUTE, appearance: { colour: 'green' } })
const tea = createTimer({ id: 'tea', name: 'Tea', kind: 'timer', plannedTime: 4 * MINUTE, appearance: { colour: 'gold' } })
const stretch = createTimer({ id: 'stretch', name: 'Stretch', kind: 'timer', plannedTime: 5 * MINUTE, appearance: { colour: 'pink' } })
const planWeek = createTimer({ id: 'plan-week', name: 'Plan the week', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'violet' } })
const reading = createTimer({ id: 'reading', name: 'Reading', description: '20 pages before bed', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'teal' }, repeatDays: [2, 4] })
const gym = createTimer({ id: 'gym', name: 'Gym', kind: 'task', plannedTime: 60 * MINUTE, appearance: { colour: 'orange' }, repeatDays: [1, 3, 5] })

/**
 * Several timers and tasks on a Tuesday: two running, one paused, one not started, one done, a repeating task done for the day,
 * and one that repeats on other days, so it shows on Timers only.
 */
const sampleTimers = [
  start(writeReport, NINE - 35 * MINUTE - 12_000).timer,
  start(tea, NINE - 90_000).timer,
  pause(start(readMail, NINE - 6 * MINUTE).timer, NINE - MINUTE).timer,
  stretch,
  start(planWeek, NINE - 40 * MINUTE).timer,
  markDone(reading, NINE - 2 * 60 * MINUTE).timer,
  gym
]

/**
 * Tracked time over this week and the one before, with some of it from a task that has since been removed.
 * Today holds only the paused run of Read mail: the runs under way are tracked once they pause or finish.
 */
const sampleTrackedTime = {
  'write-report': { '2026-11-10': 120 * MINUTE, '2026-11-12': 75 * MINUTE, '2026-11-16': 95 * MINUTE },
  'read-mail': { '2026-11-09': 20 * MINUTE, '2026-11-10': 15 * MINUTE, '2026-11-16': 25 * MINUTE, '2026-11-17': 5 * MINUTE },
  'plan-week': { '2026-11-09': 30 * MINUTE, '2026-11-16': 40 * MINUTE },
  'old-task': { '2026-11-11': 50 * MINUTE, '2026-11-16': 20 * MINUTE },
  gym: { '2026-11-09': 60 * MINUTE, '2026-11-11': 60 * MINUTE, '2026-11-13': 20 * MINUTE, '2026-11-16': 40 * MINUTE }
}

/** How the repeat days of Gym went: two of three finished in the week before, and 40 of its 60 minutes this Monday. */
const sampleRepeatDayResults = {
  gym: {
    '2026-11-09': { planned: 60 * MINUTE, tracked: 60 * MINUTE, finished: true },
    '2026-11-11': { planned: 60 * MINUTE, tracked: 60 * MINUTE, finished: true },
    '2026-11-13': { planned: 60 * MINUTE, tracked: 20 * MINUTE, finished: false },
    '2026-11-16': { planned: 60 * MINUTE, tracked: 40 * MINUTE, finished: false }
  }
}
const HOUR = 60 * MINUTE
const workdays = { kind: 'repeating', repeatDays: [1, 2, 3, 4, 5] } as const

/** Several alarms: repeating on workdays, on chosen days and at weekends, one switched off, and one ringing once. */
const sampleAlarms = [
  createAlarm({ id: 'wake-up', name: 'Wake up', time: 7 * HOUR + 30 * MINUTE, days: workdays, sendsNotification: true }),
  createAlarm({ id: 'lunch', name: 'Lunch', time: 13 * HOUR, days: workdays, sendsNotification: false }),
  createAlarm({ id: 'gym', name: 'Gym', time: 18 * HOUR + 30 * MINUTE, days: { kind: 'repeating', repeatDays: [1, 3, 5] }, sendsNotification: true }),
  switchOff(createAlarm({ id: 'long-run', name: 'Long run', time: 8 * HOUR, days: { kind: 'repeating', repeatDays: [0, 6] }, sendsNotification: true })),
  createAlarm({ id: 'dentist', name: 'Dentist', time: 15 * HOUR + 30 * MINUTE, days: { kind: 'one-time', date: '2026-11-20' }, sendsNotification: true })
]

const draftSlides = createTimer({ id: 'draft-slides', name: 'Draft slides', kind: 'task', plannedTime: 50 * MINUTE, appearance: { colour: 'teal' } })
const reviewNotes = createTimer({ id: 'review-notes', name: 'Review notes', kind: 'task', plannedTime: 30 * MINUTE, appearance: { colour: 'orange' } })
const sessionTasks = [draftSlides, reviewNotes]
const storyTimers = [...sampleTimers, ...sessionTasks]

/** One focus session twelve minutes into its first focus step, and one not started. */
const morningFocus = createFocusSession({
  id: 'morning-focus',
  name: 'Morning focus',
  taskIds: ['draft-slides', 'review-notes'],
  stepLength: 25 * MINUTE,
  breakLength: 5 * MINUTE,
  order: 'alternating'
}, taskTimesAt(sessionTasks, NINE))
const sampleSessions = [
  startSession(morningFocus, taskTimesAt(sessionTasks, NINE - 12 * MINUTE), NINE - 12 * MINUTE).session,
  createFocusSession({ id: 'afternoon', name: 'Afternoon', taskIds: ['review-notes'], stepLength: 20 * MINUTE, breakLength: 0, order: 'one after another' }, taskTimesAt(sessionTasks, NINE))
]

/** Two playlists of the person's own files, one chosen by a task and a focus session, and one still empty. */
const sampleMusic = {
  playlists: [
    {
      id: 'deep-focus',
      name: 'Deep focus',
      files: [
        { id: 'rain', name: 'rain-on-the-window.mp3', length: 1_865_000 },
        { id: 'brown-noise', name: 'brown-noise.ogg', length: 3_600_000 },
        { id: 'piano', name: 'slow-piano.wav' }
      ]
    },
    { id: 'evening', name: 'Evening', files: [] }
  ],
  backgroundSounds: [
    { owner: { of: 'timer', id: 'write-report' }, sound: { playlistId: 'deep-focus', volume: 0.3 } },
    { owner: { of: 'focus session', id: 'morning-focus' }, sound: { playlistId: 'deep-focus', volume: 0.5 } }
  ]
} as const

/** Morning focus started after Write report, so its background sound is the one heard, 40 seconds into its first file. */
const samplePlayback: Playback = {
  owners: [
    { owner: { of: 'focus session', id: 'morning-focus' }, running: true, place: { playlistId: 'deep-focus', fileId: 'rain', at: 40_000 } },
    { owner: { of: 'timer', id: 'write-report' }, running: true, place: null }
  ],
  soundPaused: false,
  playing: { owner: { of: 'focus session', id: 'morning-focus' }, playlistId: 'deep-focus', fileId: 'rain', from: 40_000, volume: 0.5 }
}

/** Write report started after Morning focus, so its background sound is the one heard, 95 seconds into its second file. */
const taskHeardPlayback: Playback = {
  owners: [
    { owner: { of: 'timer', id: 'write-report' }, running: true, place: { playlistId: 'deep-focus', fileId: 'brown-noise', at: 95_000 } },
    { owner: { of: 'focus session', id: 'morning-focus' }, running: true, place: null }
  ],
  soundPaused: false,
  playing: { owner: { of: 'timer', id: 'write-report' }, playlistId: 'deep-focus', fileId: 'brown-noise', from: 95_000, volume: 0.3 }
}

const versions: ThemeVersion[] = ['light', 'dark']
const looks = themeNames.flatMap(theme => versions.map(version => ({ theme, version })))

const ShellLook = defineComponent({
  props: {
    theme: { type: String as PropType<ThemeName>, required: true },
    version: { type: String as PropType<ThemeVersionChoice>, required: true },
    /** Whose background sound is heard: the running focus session's, or the running task's. */
    heard: { type: String as PropType<'focus session' | 'task'>, default: 'focus session' }
  },
  setup(props) {
    const clock = createManualClock(NINE)
    const playback = props.heard === 'task' ? taskHeardPlayback : samplePlayback
    const background = createMemoryBackground({ now: () => clock.now.value, timers: storyTimers, sessions: sampleSessions, trackedTime: sampleTrackedTime, repeatDayResults: sampleRepeatDayResults, music: sampleMusic, playback })
    provideStoredTimers(background.storedTimers)
    provideStoredSessions(background.storedSessions)
    provideStoredTrackedTime(background.storedTrackedTime)
    provideStoredAlarms(createMemoryStoredAlarms({ now: () => clock.now.value, alarms: sampleAlarms }))
    provideStoredPlaylists(background.storedPlaylists)
    provideDisplayClock(clock.now)
    provideStoredOverlaySettings(createMemoryOverlaySettings())
    provideSnackbar()
    provideExtensionVersion(createFixedVersion())
    const choice = provideThemeChoice()
    choice.chooseTheme(props.theme)
    choice.chooseVersion(props.version)
    return () => h(NTheme, { theme: choice.theme.value, version: choice.version.value }, () => h(PopupShell))
  }
})

const meta = {
  title: 'popup/popup-shell',
  component: ShellLook,
  args: { theme: 'frost', version: 'system' },
  argTypes: {
    theme: { control: 'select', options: themeNames },
    version: { control: 'select', options: ['system', 'light', 'dark'] }
  },
  parameters: { place: '/' },
  decorators: [(story, context) => ({
    components: { story },
    setup() {
      void useRouter().replace(context.parameters.place as string)
    },
    template: '<story />'
  })]
} satisfies Meta<typeof ShellLook>

export default meta
type Story = StoryObj<typeof meta>

export const Today: Story = {}

export const Settings: Story = {
  parameters: { place: '/settings', audioFileNames: ['Gong.mp3', 'Morning birds.ogg'] }
}

export const AllLooks: Story = {
  parameters: { place: '/settings' },
  render: () => ({
    components: { ShellLook },
    setup: () => ({ looks }),
    template: `
      <div style="display: grid; grid-template-columns: repeat(3, 480px); gap: 16px">
        <ShellLook v-for="look in looks" :key="look.theme + look.version" :theme="look.theme" :version="look.version" />
      </div>
    `
  })
}

export const Timers: Story = {
  parameters: { place: '/timers' }
}

export const TimersWhileATaskIsHeard: Story = {
  args: { heard: 'task' },
  parameters: { place: '/timers' }
}

export const Statistics: Story = {
  parameters: { place: '/statistics' }
}

export const StatisticsForOneTask: Story = {
  parameters: { place: '/statistics?task=gym' }
}

export const Alarms: Story = {
  parameters: { place: '/alarms' }
}

export const Music: Story = {
  parameters: { place: '/music' }
}

export const FocusSessions: Story = {
  parameters: { place: '/focus-sessions' }
}

export const RunningFocusSession: Story = {
  parameters: { place: '/focus-sessions?session=morning-focus' }
}
