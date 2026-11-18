<template>
  <span class="n-tag"><slot /></span>
</template>

<style scoped>
.n-tag {
  padding: 1px 7px;
  border: 1px solid var(--n-line);
  border-radius: 999px;
  background: var(--n-surface-soft);
  color: var(--n-text-muted);
  font-size: 10.5px;
  white-space: nowrap;
}
</style>
