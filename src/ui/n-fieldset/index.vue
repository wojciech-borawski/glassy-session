<script setup lang="ts">
defineProps<{
  legend: string
  error?: string
}>()

const errorId = useId()
</script>

<template>
  <fieldset class="n-fieldset" :aria-describedby="error ? errorId : undefined">
    <legend class="n-fieldset__legend">{{ legend }}</legend>
    <div class="n-fieldset__fields">
      <slot />
    </div>
    <span v-if="error" :id="errorId" class="n-fieldset__error">{{ error }}</span>
  </fieldset>
</template>

<style scoped>
.n-fieldset {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--n-text-muted);
  font-size: 11.5px;
}

.n-fieldset__legend {
  padding: 0;
  margin-bottom: 3px;
}

.n-fieldset__fields {
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  gap: 8px;
}

.n-fieldset__error {
  color: var(--n-warning);
  font-weight: 600;
}
</style>
