<script setup lang="ts">
import { useExtensionVersion } from '../../extension-version'

const { t } = useI18n()
const headingId = useId()
const version = useExtensionVersion()
</script>

<template>
  <section class="about-section" :aria-labelledby="headingId">
    <h2 :id="headingId" class="about-section__heading">{{ t('about.heading') }}</h2>
    <b class="about-section__product">{{ t('about.product') }}</b>
    <span>{{ t('about.fullName') }}</span>
    <span>{{ t('about.version', { version }) }}</span>
    <span class="about-section__muted">{{ t('about.description') }}</span>
    <span class="about-section__muted">{{ t('about.madeWith') }}</span>
  </section>
</template>

<style scoped>
.about-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.about-section__heading {
  margin: 0 0 6px;
  color: var(--n-text-muted);
  font-size: 13px;
  font-weight: var(--n-font-weight-strong);
}

.about-section__product {
  font-size: 14px;
  font-weight: var(--n-font-weight-strong);
}

.about-section__muted {
  color: var(--n-text-muted);
}
</style>
