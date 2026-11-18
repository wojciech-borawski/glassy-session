import type { StorybookConfig } from '@storybook/vue3-vite'
import { mergeConfig } from 'vite'
import { pluginsOutsideWxt } from '../vite.plugins.ts'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-docs'],
  framework: '@storybook/vue3-vite',
  viteFinal: config => mergeConfig(config, { plugins: pluginsOutsideWxt() })
}

export default config
