import type { ToolbarButton } from '@/domain/command/ports'
import type { ToolbarBadge } from '@/domain/command/toolbar-badge'

/** Keeps in `shown` every badge shown, in order, the last one being the badge on the button. */
export function createMemoryToolbarButton(): ToolbarButton & { shown: readonly (ToolbarBadge | null)[] } {
  const shown: (ToolbarBadge | null)[] = []
  return {
    shown,
    async showBadge(badge) {
      shown.push(badge)
    }
  }
}
