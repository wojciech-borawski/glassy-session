import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NSnackbar from './index.vue'

const meta = {
  title: 'kit/n-snackbar',
  component: NSnackbar,
  args: {
    messages: [
      { id: 1, text: 'Deep work started: Job 1' },
      { id: 2, text: 'Break. Next: Job 2' }
    ]
  },
  render: args => ({
    components: { NSnackbar },
    setup: () => ({ args }),
    template: '<div style="position: relative; width: 480px; height: 200px"><NSnackbar v-bind="args" /></div>'
  })
} satisfies Meta<typeof NSnackbar>

export default meta
type Story = StoryObj<typeof meta>

export const TwoMessages: Story = {}
