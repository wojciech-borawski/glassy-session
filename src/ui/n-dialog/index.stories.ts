import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NDialog from './index.vue'
import NButton from '../n-button/index.vue'
import NDayPicker from '../n-day-picker/index.vue'
import NTextField from '../n-text-field/index.vue'

const meta = {
  title: 'kit/n-dialog',
  component: NDialog,
  args: { open: true, title: 'New task' },
  render: args => ({
    components: { NDialog, NButton, NDayPicker, NTextField },
    setup: () => ({ args, name: ref(''), days: ref([1, 2, 3, 4, 5]) }),
    template: `
      <div style="position: relative; width: 480px; height: 600px; padding: 14px; box-sizing: border-box">
        <NButton icon="plus" @click="args.open = true">New</NButton>
        <NDialog v-bind="args" @close="args.open = false">
          <NTextField v-model="name" label="Name" placeholder="Job 3" />
          <NDayPicker v-model="days" label="Repeat days" />
          <div style="display: flex; gap: 6px">
            <NButton variant="primary" @click="args.open = false">Save</NButton>
            <NButton @click="args.open = false">Cancel</NButton>
          </div>
        </NDialog>
      </div>
    `
  })
} satisfies Meta<typeof NDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const Closed: Story = {
  args: { open: false }
}
