<script setup lang="ts">
import { useStoredAsOfNow } from '@/domain/command/stored-as-of-now'
import FocusSessionCards from './focus-session-cards.vue'

const { t } = useI18n()
const headingId = useId()
const asOfNow = useStoredAsOfNow()

const started = computed(() => asOfNow.value.sessions.filter(({ run }) => run !== null))
</script>

<template>
  <section v-if="started.length > 0" class="focus-sessions-now" :aria-labelledby="headingId">
    <h2 :id="headingId" class="focus-sessions-now__heading">{{ t('today.focusSessionsNow') }}</h2>
    <FocusSessionCards :sessions="started" />
  </section>
</template>

<style scoped>
.focus-sessions-now {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.focus-sessions-now__heading {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 13px;
  font-weight: var(--n-font-weight-strong);
}
</style>
