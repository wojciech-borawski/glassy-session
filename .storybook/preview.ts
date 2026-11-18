import { setup, type Decorator, type Preview } from '@storybook/vue3-vite'
import type { SoundSettings } from '@/domain/sound/model/sound'
import { provideSounds } from '@/domain/sound/sounds'
import { createPagePlayer } from '@/infrastructure/browser/page-player'
import { createMemorySounds } from '@/infrastructure/memory/sounds'
import { setupI18n } from '@/infrastructure/plugins/setup-i18n'
import { setupRouter } from '@/infrastructure/plugins/setup-router'
import NTheme from '@/ui/n-theme/index.vue'
import { themeNames } from '@/ui/n-theme/themes'

setup((app) => {
  setupI18n(app, 'popup')
  setupRouter(app, 'popup')
})

const withTheme: Decorator = (story, context) => ({
  components: { story, NTheme },
  setup: () => ({ globals: context.globals }),
  template: `
    <NTheme :theme="globals.theme" :version="globals.version">
      <div style="min-height: 100vh; box-sizing: border-box; padding: 16px; background: var(--n-backdrop)">
        <story />
      </div>
    </NTheme>
  `
})

/**
 * Gives each story sounds of its own: the settings and own audio files its parameters name, kept in memory,
 * and the page player, so a preview button in a story can be heard.
 */
const withSounds: Decorator = (story, context) => ({
  components: { story },
  setup() {
    const { soundSettings, audioFileNames = [] } = context.parameters as { soundSettings?: SoundSettings, audioFileNames?: readonly string[] }
    const sounds = createMemorySounds(soundSettings)
    for (const name of audioFileNames) {
      void sounds.audioFiles.save({ name, type: 'audio/mpeg', bytes: new ArrayBuffer(0) })
    }
    provideSounds({ ...sounds, player: createPagePlayer({ audioFiles: sounds.audioFiles }) })
  },
  template: '<story />'
})

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/
      }
    }
  },
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: { title: 'Theme', items: [...themeNames], dynamicTitle: true }
    },
    version: {
      description: 'Light or dark version',
      toolbar: { title: 'Version', items: ['system', 'light', 'dark'], dynamicTitle: true }
    }
  },
  initialGlobals: {
    theme: 'frost',
    version: 'system'
  },
  decorators: [withSounds, withTheme]
}

export default preview
