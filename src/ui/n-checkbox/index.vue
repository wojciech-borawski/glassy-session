<script setup lang="ts">
const props = defineProps<{
  label: string
  hint?: string
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [ticked: boolean]
}>()

const hintId = useId()

function askToFlip(event: Event) {
  (event.target as HTMLInputElement).checked = props.modelValue
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <div class="n-checkbox">
    <label class="n-checkbox__labelled">
      <input
        class="n-checkbox__box"
        type="checkbox"
        :checked="modelValue"
        :aria-describedby="hint ? hintId : undefined"
        @change="askToFlip"
      >
      <slot />
      <span class="n-checkbox__label">{{ label }}</span>
    </label>
    <span v-if="hint" :id="hintId" class="n-checkbox__hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.n-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 7px 10px;
  border: 1px solid var(--n-line);
  border-radius: var(--n-radius-control);
  background: var(--n-surface);
}

.n-checkbox:has(.n-checkbox__box:checked) {
  border-color: var(--n-accent);
}

.n-checkbox__labelled {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: 0;
  cursor: pointer;
}

.n-checkbox__box {
  width: 15px;
  height: 15px;
  margin: 0;
  accent-color: var(--n-accent);
}

.n-checkbox__box:focus-visible {
  outline: var(--n-focus-ring);
  outline-offset: 2px;
}

.n-checkbox__label {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.n-checkbox__hint {
  flex: none;
  color: var(--n-text-muted);
  font-size: 11.5px;
}
</style>
