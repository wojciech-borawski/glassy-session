import type { Ringer } from '@/domain/timer/ports'

export function createMemoryRinger(): Ringer & { rang: readonly string[] } {
  const rang: string[] = []
  return {
    rang,
    async ring(timer) {
      rang.push(timer.id)
    }
  }
}
