<script setup lang="ts">
import { useStoredOverlaySettings } from '@/domain/overlay/stored-overlay-settings'
import NSwitchRow from '@/ui/n-switch-row/index.vue'

const { t } = useI18n()
const headingId = useId()
const { settings, change } = useStoredOverlaySettings()
</script>

<template>
  <section class="overlay-section" :aria-labelledby="headingId">
    <h2 :id="headingId" class="overlay-section__heading">{{ t('overlaySettings.heading') }}</h2>
    <NSwitchRow
      :label="t('overlaySettings.shownOnPages')"
      :hint="t('overlaySettings.shownOnPagesHint')"
      :model-value="settings.shownOnPages"
      @update:model-value="shownOnPages => change({ shownOnPages })"
    />
  </section>
</template>

<style scoped>
.overlay-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.overlay-section__heading {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 13px;
  font-weight: var(--n-font-weight-strong);
}
</style>
