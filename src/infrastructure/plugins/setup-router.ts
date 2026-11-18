import type { App } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import generatedRoutes from 'virtual:generated-pages'

function pathRemoveBaseRouteFromStart(path: string, baseRoute: string): string {
  const PREFIX = `/${baseRoute}`
  const newPath = path.replace(new RegExp(`^${PREFIX}`, 'g'), '')
  return newPath === '' ? '/' : newPath
}

export function setupRouter(app: App, baseRoute: string) {
  const routes = generatedRoutes
    .filter(route => route.path.includes(baseRoute))
    .map(route => ({ ...route, path: pathRemoveBaseRouteFromStart(route.path, baseRoute) }))
  const router = createRouter({ history: createWebHashHistory(), routes })
  app.use(router)
}
