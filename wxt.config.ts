import { defineConfig } from 'wxt'
import { plugins } from './vite.plugins.ts'

const PRODUCT_NAME = 'GlassySession'

const LISTING_NAME = `${PRODUCT_NAME}: Timer, Alarm and Focus sessions`

/** The toolbar button. WXT merges the popup into the action key of the manifest version, so the button is set under that key. Its icon is rendered from `assets/icon.svg` into `public/icon` by `npm run icons`. */
const ACTION = { default_title: PRODUCT_NAME, default_icon: { 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png' } }

/** The Firefox add-on id. AMO needs it, and it keeps the extension's storage and audio files from one install to the next. */
const FIREFOX_ID = 'glassy-session@wojciech-borawski.github.io'

/** Firefox asks every new add-on what data it collects and sends out. The extension sends nothing anywhere. */
const FIREFOX_SETTINGS = { gecko: { id: FIREFOX_ID, data_collection_permissions: { required: ['none'] } } }

/** Folders and files the sources zip leaves out, beside WXT's own: what a build, Storybook or a log leaves behind, which the extension is not built from. */
const NOT_SOURCES = ['storybook-static/**', 'dist/**', 'dist-ssr/**', 'coverage/**', 'logs/**', '**/*.log', '**/*.local', 'stats.html']

export default defineConfig({
  srcDir: 'src',
  entrypointsDir: 'application',
  modules: ['@wxt-dev/module-vue'],
  imports: {
    presets: [
      'vue-router',
      { from: 'vue-i18n', imports: ['useI18n'] }
    ],
    dirs: []
  },
  manifest: ({ mode, browser, manifestVersion }) => ({
    name: `${mode === 'development' ? '[INTERNAL] ' : ''}${LISTING_NAME}`,
    short_name: PRODUCT_NAME,
    [manifestVersion === 2 ? 'browser_action' : 'action']: ACTION,
    permissions: ['storage', 'alarms', 'notifications', ...browser === 'firefox' ? [] : ['offscreen']],
    ...browser === 'firefox' ? { browser_specific_settings: FIREFOX_SETTINGS } : {}
  }),
  zip: { excludeSources: NOT_SOURCES },
  vite: () => ({ plugins })
})
