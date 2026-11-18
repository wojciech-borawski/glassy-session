import { inject, provide, type InjectionKey, type Ref } from 'vue'
import type { Moment } from '@/utils/time/units'

/** The moment a view draws remaining time for. It only redraws: commands take their moment in the background. */
export type DisplayClock = Readonly<Ref<Moment>>

const displayClockKey: InjectionKey<DisplayClock> = Symbol('display clock')

/** Gives every component below this one the display clock, a ticking one in the extension or one moved by hand in tests. */
export function provideDisplayClock(now: DisplayClock): void {
  provide(displayClockKey, now)
}

export function useDisplayClock(): DisplayClock {
  const now = inject(displayClockKey)
  if (!now) throw new Error('useDisplayClock needs provideDisplayClock in an ancestor component')
  return now
}
