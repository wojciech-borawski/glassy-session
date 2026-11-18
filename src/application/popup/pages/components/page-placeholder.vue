<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <p class="page-placeholder">{{ t('page.placeholder') }}</p>
</template>

<style scoped>
.page-placeholder {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 12px;
}
</style>
