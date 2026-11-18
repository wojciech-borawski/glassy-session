import type { App } from 'vue'
import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'

export function createAppI18n() {
  return createI18n({
    locale: 'en',
    messages
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setupI18n(app: App, _baseRoute: string) {
  app.use(createAppI18n())
}
