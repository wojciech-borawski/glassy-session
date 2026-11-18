import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NTheme from './index.vue'
import { themeNames, type ThemeVersion } from './themes'
import NButton from '../n-button/index.vue'
import NCard from '../n-card/index.vue'
import NProgressBar from '../n-progress-bar/index.vue'
import NProgressLine from '../n-progress-line/index.vue'
import NRing from '../n-ring/index.vue'
import NSwitch from '../n-switch/index.vue'
import NTabBar from '../n-tab-bar/index.vue'
import NTag from '../n-tag/index.vue'

const versions: ThemeVersion[] = ['light', 'dark']
const looks = themeNames.flatMap(theme => versions.map(version => ({ theme, version })))

const tabs = [
  { id: 'today', label: 'Today', icon: 'sun' },
  { id: 'timers', label: 'Timers', icon: 'stopwatch' },
  { id: 'focus', label: 'Focus', icon: 'target' },
  { id: 'settings', label: 'Settings', icon: 'sliders' }
] as const

const segments = [
  { length: 30, fill: 1, color: '#2f7dd1' },
  { length: 5, fill: 1, color: 'var(--n-text-muted)' },
  { length: 30, fill: 0.4, color: '#c2571a' },
  { length: 5, fill: 0, color: 'var(--n-text-muted)' },
  { length: 30, fill: 0, color: '#2f7dd1' }
]

const meta = {
  title: 'theme/n-theme',
  component: NTheme,
  args: { theme: 'frost', version: 'system' },
  argTypes: {
    theme: { control: 'select', options: themeNames },
    version: { control: 'select', options: ['system', 'light', 'dark'] }
  }
} satisfies Meta<typeof NTheme>

export default meta
type Story = StoryObj<typeof meta>

const sample = `
  <section style="display: flex; flex-direction: column; gap: 10px; padding: 14px; background: var(--n-backdrop)">
    <NCard>
      <template #header>
        <b style="flex: 1">Job 1</b>
        <NTag>Task</NTag>
        <NButton icon="pin" label="Pin Job 1 to the overlay" :pressed="true" />
      </template>
      <div style="display: flex; gap: 14px; align-items: center">
        <NRing label="Job 1" :value="0.35" :size="88">
          <b style="font-variant-numeric: tabular-nums">16:15</b>
        </NRing>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 8px">
          <NProgressLine label="Deep work" :segments="segments" />
          <NProgressBar label="Job 1" :value="0.35" />
          <div style="display: flex; align-items: center; gap: 8px; color: var(--n-text-muted)">
            <NSwitch label="Sound" :model-value="true" /> Sound
          </div>
        </div>
      </div>
      <template #footer>
        <NButton variant="primary" icon="pause" style="flex: 1">Pause</NButton>
        <NButton icon="skip-forward">Skip break</NButton>
      </template>
    </NCard>
    <NCard greyed>
      <template #header><b style="flex: 1">Inbox zero</b><NTag>Done</NTag></template>
    </NCard>
    <NTabBar label="Places" :tabs="tabs" current="today" />
  </section>
`

const components = { NTheme, NButton, NCard, NProgressBar, NProgressLine, NRing, NSwitch, NTabBar, NTag }

export const AllLooks: Story = {
  render: () => ({
    components,
    setup: () => ({ looks, tabs, segments }),
    template: `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 420px)); gap: 12px">
        <NTheme v-for="look in looks" :key="look.theme + look.version" :theme="look.theme" :version="look.version">
          <div style="display: flex; flex-direction: column; background: var(--n-backdrop)">
            <strong style="padding: 10px 14px 0">{{ look.theme }}, {{ look.version }}</strong>
            ${sample}
          </div>
        </NTheme>
      </div>
    `
  })
}

export const Playground: Story = {
  render: args => ({
    components,
    setup: () => ({ args, tabs, segments }),
    template: `<NTheme v-bind="args"><div style="max-width: 420px">${sample}</div></NTheme>`
  })
}
