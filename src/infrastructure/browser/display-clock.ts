import { getCurrentScope, onScopeDispose, readonly, ref } from 'vue'
import type { DisplayClock } from '@/domain/display-clock'

const TICK = 250

/**
 * A display clock that reads the system clock a few times a second, so remaining time redraws on time.
 * Created inside a component or effect scope, it stops ticking when that scope ends.
 */
export function createTickingClock(): DisplayClock {
  const now = ref(Date.now())
  const ticking = setInterval(() => {
    now.value = Date.now()
  }, TICK)
  if (getCurrentScope()) {
    onScopeDispose(() => clearInterval(ticking))
  }
  return readonly(now)
}
