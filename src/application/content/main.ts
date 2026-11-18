import { createApp, type App } from 'vue'
import AppRoot from './app.vue'
import { setupI18n } from '@/infrastructure/plugins/setup-i18n'

export function mountApp(rootContainer: string | Element): App {
  const app = createApp(AppRoot)
  setupI18n(app, 'content-script')
  app.mount(rootContainer)
  return app
}
