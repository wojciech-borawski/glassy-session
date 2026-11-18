import { fileURLToPath } from 'node:url'
import type { PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import pages from 'vite-plugin-pages'
import { WxtVitest } from 'wxt/testing/vitest-plugin'

function resolvePath(path: string) {
  return fileURLToPath(new URL(path, import.meta.url))
}

/**
 * Vite plugins shared by the extension build (wxt.config.ts), Vitest and Storybook.
 * The Vue plugin and auto-imports are added by WXT, so they are not listed here.
 */
export const plugins: PluginOption[] = [
  vueI18nPlugin({
    include: resolvePath('./src/locales/**')
  }),
  pages({
    dirs: [
      { dir: 'src/application/popup/pages', baseRoute: 'popup' }
    ],
    exclude: ['**/components/*.vue', '**/*.test.ts'],
    importMode: 'sync'
  })
]

/**
 * The build's plugins for Vitest and Storybook, which run without WXT.
 * WxtVitest reads wxt.config.ts and adds its auto-imports, path aliases and the fake `browser`.
 */
export function pluginsOutsideWxt(): PluginOption[] {
  return [vue(), ...plugins, WxtVitest()]
}
