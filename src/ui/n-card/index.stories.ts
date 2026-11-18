import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NCard from './index.vue'
import NButton from '../n-button/index.vue'
import NTag from '../n-tag/index.vue'

const meta = {
  title: 'kit/n-card',
  component: NCard,
  args: { greyed: false },
  render: args => ({
    components: { NCard, NButton, NTag },
    setup: () => ({ args }),
    template: `
      <NCard v-bind="args" style="max-width: 240px">
        <template #header>
          <div style="flex: 1; min-width: 0; display: flex; flex-direction: column">
            <b>Job 1</b>
            <span style="display: flex; gap: 4px"><NTag>Task</NTag></span>
          </div>
          <NButton icon="pin" label="Pin Job 1 to the overlay" :pressed="false" />
        </template>
        <div style="font-size: 24px; line-height: 1.1">3:15:00</div>
        <template #footer>
          <NButton variant="primary" icon="play" style="flex: 1">Start</NButton>
          <NButton icon="rotate-left" label="Reset Job 1" />
        </template>
      </NCard>
    `
  })
} satisfies Meta<typeof NCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Greyed: Story = {
  args: { greyed: true }
}

export const AsButton: Story = {
  render: () => ({
    components: { NCard, NTag },
    template: `
      <NCard as="button" aria-pressed="true" style="max-width: 240px">
        <b>Frost</b>
        <span>Glass with Windows 11: quiet and squared</span>
        <NTag style="align-self: flex-start">Selected</NTag>
      </NCard>
    `
  })
}
