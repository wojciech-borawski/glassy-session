<script setup lang="ts">
defineProps<{
  messages: readonly { id: string | number, text: string }[]
}>()
</script>

<template>
  <div class="n-snackbar" role="status">
    <p v-for="message in messages" :key="message.id" class="n-snackbar__message">
      {{ message.text }}
    </p>
  </div>
</template>

<style scoped>
.n-snackbar {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 280px;
  pointer-events: none;
}

.n-snackbar__message {
  box-sizing: border-box;
  margin: 0;
  padding: 9px 13px;
  border: 1px solid var(--n-accent);
  border-radius: var(--n-radius);
  background: var(--n-surface);
  box-shadow: var(--n-shadow-snackbar);
  backdrop-filter: blur(20px);
}
</style>
