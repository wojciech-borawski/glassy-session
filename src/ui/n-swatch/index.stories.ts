import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NSwatch from './index.vue'

const meta = {
  title: 'kit/n-swatch',
  component: NSwatch,
  args: { colour: 'teal', initial: 'W', size: 'tile' }
} satisfies Meta<typeof NSwatch>

export default meta
type Story = StoryObj<typeof meta>

export const Tile: Story = {}

export const Dot: Story = {
  args: { size: 'dot' }
}
