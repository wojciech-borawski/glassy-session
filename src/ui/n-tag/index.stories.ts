import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NTag from './index.vue'

const meta = {
  title: 'kit/n-tag',
  component: NTag,
  render: () => ({
    components: { NTag },
    template: '<div style="display: flex; gap: 4px"><NTag>Task</NTag><NTag>Focus session</NTag></div>'
  })
} satisfies Meta<typeof NTag>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
