<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import NIcon from '@/ui/n-icon/index.vue'
import { formatCountdown } from '@/utils/time/format-duration'
import type { Duration } from '@/utils/time/units'
import { edgesOf, nudged, placedIn, positionOf, visibleAreaOf, type Box, type OverlayPosition } from './model/overlay-settings'

const props = defineProps<{
  position: OverlayPosition
  collapsed: boolean
  count: number
  /** The first pinned one that is running, shown on the pill instead of the count. */
  running?: Readonly<{ name: string, remainingTime: Duration, more: number }> | null
}>()

const emit = defineEmits<{
  collapse: []
  expand: []
  move: [position: OverlayPosition]
}>()

const { t } = useI18n()

const pillLabel = computed(() => props.running
  ? t('overlay.expandRunning', { name: props.running.name, remainingTime: formatCountdown(props.running.remainingTime), more: props.running.more }, props.running.more)
  : t('overlay.expand', { count: props.count }, props.count))

const moveMode = shallowRef(false)

/** Where the overlay was dropped or nudged to, shown until the saved position comes back. */
const unsaved = shallowRef<OverlayPosition | null>(null)
watch(() => props.position, () => {
  unsaved.value = null
})
const shownPosition = computed(() => unsaved.value ?? props.position)

const overlay = useTemplateRef<HTMLElement>('overlay')

const pageSize = () => visibleAreaOf(window, document.documentElement)

/** The sizes of the page and the overlay as last measured, which decide how far in the overlay must come to stay whole inside the page. */
const measured = shallowRef({ page: pageSize(), overlay: { width: 0, height: 0 } })

function measure() {
  const box = overlay.value?.getBoundingClientRect()
  measured.value = { page: pageSize(), overlay: { width: box?.width ?? 0, height: box?.height ?? 0 } }
}

/** Measures again each time the overlay changes size, as when more are pinned, where the browser can tell. */
let sizeWatch: ResizeObserver | null = null

watch(overlay, (element) => {
  sizeWatch?.disconnect()
  sizeWatch = element !== null && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null
  if (element !== null) {
    sizeWatch?.observe(element)
  }
  measure()
}, { flush: 'post' })
onMounted(() => window.addEventListener('resize', measure))

/** The two page edges of the corner, each kept its distance away. */
const place = computed(() => {
  const { corner, offset } = placedIn(shownPosition.value, measured.value.overlay, measured.value.page)
  const [edge, side] = edgesOf(corner)
  return { [edge]: `${offset.y}px`, [side]: `${offset.x}px` }
})

const dragStart = shallowRef<{ pointerId: number, x: number, y: number, box: Box } | null>(null)
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
  window.removeEventListener('keydown', stopOnEscape, { capture: true })
}

function stopOnEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    stopDragging()
  }
}

function drop(event: PointerEvent) {
  const start = dragStart.value
  if (event.pointerId !== start?.pointerId) {
    return
  }
  stopDragging()
  const box = { ...start.box, left: start.box.left + event.clientX - start.x, top: start.box.top + event.clientY - start.y }
  unsaved.value = positionOf(box, pageSize())
  emit('move', unsaved.value)
}

watch(() => props.collapsed, (collapsed) => {
  if (collapsed) {
    moveMode.value = false
    stopDragging()
  }
})

function toggleMoveMode() {
  moveMode.value = !moveMode.value
  stopDragging()
}

/** What a press goes to instead of moving the overlay. */
const CONTROLS = 'button, a[href], input, select, textarea, label, summary, [role="button"], [role="slider"], [contenteditable]'

function startDragging(event: PointerEvent) {
  if (!moveMode.value || dragStart.value !== null || (event.target as Element).closest(CONTROLS) !== null) {
    return
  }
  const panel = event.currentTarget as HTMLElement
  panel.setPointerCapture?.(event.pointerId)
  const { left, top, width, height } = panel.getBoundingClientRect()
  dragStart.value = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, box: { left, top, width, height } }
  window.addEventListener('pointermove', follow)
  window.addEventListener('pointerup', drop)
  window.addEventListener('pointercancel', stopDragging)
  window.addEventListener('blur', stopDragging)
  window.addEventListener('keydown', stopOnEscape, { capture: true })
}

const ARROWS: Readonly<Record<string, Readonly<{ x: number, y: number }>>> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }
}

function nudgeByKey(event: KeyboardEvent) {
  const direction = ARROWS[event.key]
  if (!moveMode.value || direction === undefined || overlay.value === null) {
    return
  }
  event.preventDefault()
  const step = event.shiftKey ? 32 : 8
  const { width, height } = overlay.value.getBoundingClientRect()
  unsaved.value = nudged(shownPosition.value, { x: direction.x * step, y: direction.y * step }, { width, height }, pageSize())
  emit('move', unsaved.value)
}

onUnmounted(() => {
  stopDragging()
  window.removeEventListener('resize', measure)
  sizeWatch?.disconnect()
})
</script>

<template>
  <button v-if="collapsed" ref="overlay" type="button" class="overlay-panel__pill" :style="place" :aria-label="pillLabel" @click="emit('expand')">
    <template v-if="running">
      <slot name="running-icon" />
      <span aria-hidden="true">{{ formatCountdown(running.remainingTime) }}</span>
      <span v-if="running.more > 0" aria-hidden="true" class="overlay-panel__more">+{{ running.more }}</span>
    </template>
    <template v-else>
      <NIcon name="pin" :size="14" />
      <span aria-hidden="true">{{ count }}</span>
    </template>
  </button>
  <section v-else ref="overlay" class="overlay-panel" :class="{ 'overlay-panel--move-mode': moveMode }" :aria-label="t('overlay.label')" :style="{ ...place, translate: `${dragOffset.x}px ${dragOffset.y}px` }" @pointerdown="startDragging">
    <header class="overlay-panel__header">
      <span class="overlay-panel__title">
        <NIcon name="pin" :size="14" />
        <span>{{ t('overlay.title') }}</span>
      </span>
      <NButton icon="move" :label="t('overlay.move')" :pressed="moveMode" @click="toggleMoveMode" @keydown="nudgeByKey" />
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
  background: var(--n-float-app);
  box-shadow: var(--n-shadow-dialog);
  backdrop-filter: blur(8px) saturate(1.3);
  --n-surface: var(--n-float-surface);
  --n-text-muted: var(--n-float-text-muted);
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

.overlay-panel--move-mode {
  outline: 1.5px dashed color-mix(in srgb, var(--n-accent) 65%, transparent);
  outline-offset: 3px;
  cursor: move;
  user-select: none;
  touch-action: none;
}

.overlay-panel__title {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  padding: 0 4px;
  color: var(--n-text-muted);
  font-size: 11.5px;
  font-weight: var(--n-font-weight-strong);
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
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.overlay-panel__more {
  padding: 0 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--n-accent) 16%, transparent);
  color: var(--n-text);
  font-size: 11px;
  line-height: 18px;
}

.overlay-panel__pill:focus-visible {
  outline: var(--n-focus-ring);
  outline-offset: 2px;
}
</style>
