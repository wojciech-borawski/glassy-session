<script setup lang="ts">
defineProps<{
  label: string
  hideLabel?: boolean
  error?: string
}>()

const errorId = useId()
</script>

<template>
  <div class="n-field">
    <label class="n-field__labelled">
      <span class="n-field__label" :class="{ 'n-field__label--hidden': hideLabel }">{{ label }}</span>
      <slot :described-by="error ? errorId : undefined" :invalid="error ? true : undefined" />
    </label>
    <span v-if="error" :id="errorId" class="n-field__error">{{ error }}</span>
  </div>
</template>

<style scoped>
.n-field,
.n-field__labelled {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.n-field {
  color: var(--n-text-muted);
  font-size: 11.5px;
}

.n-field__label--hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.n-field__error {
  color: var(--n-warning);
  font-weight: 600;
}

.n-field :slotted(.n-field__control) {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 6px 10px;
  border: 1px solid var(--n-line);
  border-radius: var(--n-radius-control);
  background: var(--n-surface);
  color: var(--n-text);
  font: inherit;
  font-size: 13px;
}

.n-field :slotted(.n-field__control[aria-invalid="true"]) {
  border-color: var(--n-warning);
}

.n-field :slotted(.n-field__control:focus-visible) {
  outline: var(--n-focus-ring);
  outline-offset: 2px;
}
</style>
