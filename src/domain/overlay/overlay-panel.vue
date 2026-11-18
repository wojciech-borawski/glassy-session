<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import NIcon from '@/ui/n-icon/index.vue'
import { cornerToward, nearestCorner, type Corner } from './model/overlay-settings'

const props = defineProps<{
  corner: Corner
  collapsed: boolean
  count: number
}>()

const emit = defineEmits<{
  collapse: []
  expand: []
  move: [corner: Corner]
}>()

const { t } = useI18n()

const GAP = '12px'

/** The two page edges of the corner, each kept a gap away. */
const place = computed(() => Object.fromEntries(props.corner.split(' ').map((edge) => [edge, GAP])))

const dragStart = shallowRef<{ pointerId: number, x: number, y: number } | null>(null)
const dragOffset = shallowRef({ x: 0, y: 0 })

function follow(event: PointerEvent) {
  if (event.pointerId === dragStart.value?.pointerId) {
    dragOffset.value = { x: event.clientX - dragStart.value.x, y: event.clientY - dragStart.value.y }
  }
}

function stopDragging() {
  dragStart.value = null
  dragOffset.value = { x: 0, y: 0 }
  window.removeEventListener('pointermove', follow)
  window.removeEventListener('pointerup', drop)
  window.removeEventListener('pointercancel', stopDragging)
  window.removeEventListener('blur', stopDragging)
  window.removeEventListener('keydown', stopOnEscape)
}

function stopOnEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    stopDragging()
  }
}

function drop(event: PointerEvent) {
  if (event.pointerId !== dragStart.value?.pointerId) {
    return
  }
  stopDragging()
  const corner = nearestCorner({ x: event.clientX, y: event.clientY }, { width: window.innerWidth, height: window.innerHeight })
  if (corner !== props.corner) {
    emit('move', corner)
  }
}

function startDragging(event: PointerEvent) {
  if (dragStart.value !== null) {
    return
  }
  dragStart.value = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
  window.addEventListener('pointermove', follow)
  window.addEventListener('pointerup', drop)
  window.addEventListener('pointercancel', stopDragging)
  window.addEventListener('blur', stopDragging)
  window.addEventListener('keydown', stopOnEscape)
}

const ARROWS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' } as const

function moveByKey(event: KeyboardEvent) {
  if (!(event.key in ARROWS)) {
    return
  }
  event.preventDefault()
  const corner = cornerToward(props.corner, ARROWS[event.key as keyof typeof ARROWS])
  if (corner !== props.corner) {
    emit('move', corner)
  }
}

onUnmounted(stopDragging)
</script>

<template>
  <button v-if="collapsed" type="button" class="overlay-panel__pill" :style="place" :aria-label="t('overlay.expand', { count }, count)" @click="emit('expand')">
    <NIcon name="pin" :size="14" />
    <span aria-hidden="true">{{ count }}</span>
  </button>
  <section v-else class="overlay-panel" :aria-label="t('overlay.label')" :style="{ ...place, translate: `${dragOffset.x}px ${dragOffset.y}px` }">
    <header class="overlay-panel__header">
      <button type="button" class="overlay-panel__handle" :aria-label="t('overlay.move')" @pointerdown="startDragging" @keydown="moveByKey">
        <NIcon name="pin" :size="14" />
        <span>{{ t('overlay.title') }}</span>
      </button>
      <NButton icon="chevron-down" :label="t('overlay.collapse')" @click="emit('collapse')" />
    </header>
    <ul class="overlay-panel__list">
      <slot />
    </ul>
    <slot name="messages" />
  </section>
</template>

<style scoped>
.overlay-panel,
.overlay-panel__pill {
  position: fixed;
  z-index: 2147483647;
  box-sizing: border-box;
  border: 1px solid var(--n-line);
  background: var(--n-app);
  box-shadow: var(--n-shadow-dialog);
  backdrop-filter: blur(24px) saturate(1.4);
  color: var(--n-text);
  pointer-events: auto;
}

.overlay-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 260px;
  max-height: calc(100vh - 24px);
  padding: 6px 8px 8px;
  overflow-y: auto;
  border-radius: var(--n-radius-large);
}

.overlay-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.overlay-panel__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.overlay-panel__handle {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  padding: 0 4px;
  border: 0;
  border-radius: var(--n-radius-control);
  background: none;
  color: var(--n-text-muted);
  font: inherit;
  font-size: 11.5px;
  font-weight: var(--n-font-weight-strong);
  cursor: grab;
  touch-action: none;
}

.overlay-panel__handle:active {
  cursor: grabbing;
}

.overlay-panel__pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 4px 12px;
  border-radius: 999px;
  font: inherit;
  font-weight: var(--n-font-weight-strong);
  cursor: pointer;
}

.overlay-panel__handle:focus-visible,
.overlay-panel__pill:focus-visible {
  outline: var(--n-focus-ring);
  outline-offset: 2px;
}
</style>
