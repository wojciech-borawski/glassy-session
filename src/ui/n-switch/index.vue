<script setup lang="ts">
const props = defineProps<{
  label: string
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [on: boolean]
}>()
</script>

<template>
  <button
    type="button"
    class="n-switch"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    @click="emit('update:modelValue', !props.modelValue)"
  />
</template>

<style scoped>
.n-switch {
  box-sizing: border-box;
  position: relative;
  flex: none;
  width: 36px;
  height: 21px;
  padding: 0;
  border: 1px solid var(--n-line);
  border-radius: 999px;
  background: var(--n-track);
  cursor: pointer;
}

.n-switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: var(--n-text);
  transition: transform .15s;
}

.n-switch[aria-checked="true"] {
  background: var(--n-accent);
}

.n-switch[aria-checked="true"]::after {
  background: var(--n-on-accent);
  transform: translateX(15px);
}

.n-switch:focus-visible {
  outline: var(--n-focus-ring);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .n-switch::after {
    transition: none;
  }
}
</style>
