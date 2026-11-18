import type { App } from 'vue'
import type { ContentScriptContext, ShadowRootContentScriptUi } from '#imports'
import { mountApp } from '@/application/content/main'
import { followOverlayShown } from '@/application/content/overlay-shown'

/** The overlay's UI in a closed shadow root, so the page's own scripts cannot reach into it. */
function createOverlayUi(ctx: ContentScriptContext): Promise<ShadowRootContentScriptUi<App>> {
  return createShadowRootUi(ctx, {
    name: 'glassy-session-overlay',
    position: 'inline',
    anchor: 'body',
    mode: 'closed',
    isolateEvents: true,
    onMount(container) {
      const root = document.createElement('div')
      container.append(root)
      return mountApp(root)
    },
    onRemove(app) {
      app?.unmount()
    }
  })
}

/**
 * The page gets the overlay only while something is pinned and the overlay is switched on, so a page with nothing pinned holds
 * no element of the extension and runs no display clock. The UI is made the first time it shows, and is removed and mounted again as that changes.
 */
export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  cssInjectionMode: 'ui',
  main(ctx) {
    if (document.body === null) {
      return
    }
    let ui: Promise<ShadowRootContentScriptUi<App>> | null = null
    let wanted = false
    const stop = followOverlayShown(async (shown) => {
      wanted = shown
      if (shown && ui === null) {
        ui = createOverlayUi(ctx)
      }
      const made = await ui
      if (made === null || ctx.isInvalid) {
        return
      }
      if (wanted && made.mounted === undefined) {
        made.mount()
      } else if (!wanted && made.mounted !== undefined) {
        made.remove()
      }
    })
    ctx.onInvalidated(stop)
  }
})
