<script setup lang="ts">
import { useStoredAsOfNow } from '@/domain/command/stored-as-of-now'
import { useDisplayClock } from '@/domain/display-clock'
import FocusSessionCard from '@/domain/session/focus-session-card.vue'
import type { FocusSession } from '@/domain/session/model/focus-session'
import { useSessionCommands } from '@/domain/session/use-session-commands'

defineProps<{
  sessions: readonly FocusSession[]
}>()

defineEmits<{
  edit: [session: FocusSession]
}>()

const asOfNow = useStoredAsOfNow()
const now = useDisplayClock()
const commands = useSessionCommands()
const router = useRouter()

function open(session: FocusSession) {
  void router.push({ path: '/focus-sessions', query: { session: session.id } })
}
</script>

<template>
  <FocusSessionCard
    v-for="session in sessions"
    :key="session.id"
    :data-session="session.id"
    :session="session"
    :tasks="asOfNow.timers"
    :now="now"
    @start="commands.start(session)"
    @pause="commands.pause(session)"
    @resume="commands.resume(session)"
    @skip="commands.skip(session)"
    @end-early="commands.endEarly(session)"
    @edit="$emit('edit', session)"
    @open="open(session)"
    @pin="commands.pin(session)"
    @unpin="commands.unpin(session)"
  />
</template>
