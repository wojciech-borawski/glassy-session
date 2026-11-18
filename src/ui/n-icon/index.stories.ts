import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NIcon from './index.vue'
import { icons } from './icons'

const meta = {
  title: 'kit/n-icon',
  component: NIcon,
  args: { name: 'play', size: 16 },
  argTypes: { name: { control: 'select', options: Object.keys(icons) } }
} satisfies Meta<typeof NIcon>

export default meta
type Story = StoryObj<typeof meta>

export const Single: Story = {}

export const AllIcons: Story = {
  render: () => ({
    components: { NIcon },
    setup: () => ({ names: Object.keys(icons) }),
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, 110px); gap: 12px">
        <div v-for="name in names" :key="name" style="display: flex; gap: 8px; align-items: center">
          <NIcon :name="name" :size="18" />
          <span>{{ name }}</span>
        </div>
      </div>
    `
  })
}
