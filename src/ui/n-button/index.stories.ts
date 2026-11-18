import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NButton from './index.vue'
import { icons } from '../n-icon/icons'

const meta = {
  title: 'kit/n-button',
  component: NButton,
  argTypes: {
    variant: { control: 'inline-radio', options: ['plain', 'primary'] },
    icon: { control: 'select', options: [undefined, ...Object.keys(icons)] },
    pressed: { control: 'select', options: [undefined, true, false] }
  },
  render: args => ({
    components: { NButton },
    setup: () => ({ args }),
    template: '<NButton v-bind="args">Start</NButton>'
  })
} satisfies Meta<typeof NButton>

export default meta
type Story = StoryObj<typeof meta>

export const Plain: Story = {
  args: { icon: 'rotate-left' }
}

export const Primary: Story = {
  args: { variant: 'primary', icon: 'play' }
}

export const IconOnly: Story = {
  args: { icon: 'pencil', label: 'Edit Job 1' },
  render: args => ({
    components: { NButton },
    setup: () => ({ args }),
    template: '<NButton v-bind="args" />'
  })
}

export const Pressed: Story = {
  render: () => ({
    components: { NButton },
    template: `
      <div style="display: flex; gap: 6px">
        <NButton :pressed="false">Match system</NButton>
        <NButton :pressed="true">Light</NButton>
        <NButton :pressed="false">Dark</NButton>
        <NButton icon="pin" label="Pin Job 1 to the overlay" :pressed="true" />
      </div>
    `
  })
}

export const Disabled: Story = {
  render: () => ({
    components: { NButton },
    template: '<NButton variant="primary" icon="play" disabled>Start</NButton>'
  })
}
