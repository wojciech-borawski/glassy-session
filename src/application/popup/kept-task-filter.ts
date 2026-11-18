import type { InjectionKey, Ref } from 'vue'
import type { TaskFilter } from '@/domain/tracking/model/statistics'

const keptTaskFilterKey: InjectionKey<Ref<TaskFilter>> = Symbol('kept task filter')

/** Keeps the task filter of the statistics for as long as this component lives, which for the popup shell is until the popup closes. Nothing is stored. */
export function provideKeptTaskFilter(): Ref<TaskFilter> {
  const kept = ref<TaskFilter>([])
  provide(keptTaskFilterKey, kept)
  return kept
}

export function useKeptTaskFilter(): Ref<TaskFilter> {
  const kept = inject(keptTaskFilterKey)
  if (!kept) throw new Error('useKeptTaskFilter needs provideKeptTaskFilter in an ancestor component')
  return kept
}
