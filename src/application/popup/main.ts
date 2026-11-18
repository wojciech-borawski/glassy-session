import { createApp } from 'vue'
import './style.css'
import App from './app.vue'
import { setupRouter } from '@/infrastructure/plugins/setup-router'
import { setupI18n } from '@/infrastructure/plugins/setup-i18n'

const name = 'popup'
const app = createApp(App)
setupRouter(app, name)
setupI18n(app, name)
app.mount('#app')
