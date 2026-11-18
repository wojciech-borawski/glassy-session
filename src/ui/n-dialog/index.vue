<script setup lang="ts">
import NButton from '../n-button/index.vue'

const props = defineProps<{
  open: boolean
  title: string
  /** Holds the body and the actions in one form, so Enter in a field or a submit action asks to submit. */
  form?: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: []
}>()

const { t } = useI18n()
const titleId = useId()
const dialog = useTemplateRef('dialog')
const content = useTemplateRef('content')

const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusedElement() {
  let focused = document.activeElement
  while (focused?.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement
  return focused as HTMLElement | null
}

let opener: HTMLElement | null = null

async function takeFocus() {
  opener = focusedElement()
  await nextTick()
  const firstControl = content.value?.querySelector<HTMLElement>(focusableSelector)
  const closeButton = dialog.value?.querySelector<HTMLElement>(focusableSelector)
  const target = firstControl ?? closeButton
  target?.focus()
}

function giveFocusBack() {
  opener?.focus()
  opener = null
}

watch(() => props.open, open => open ? takeFocus() : giveFocusBack(), { immediate: true })
onBeforeUnmount(giveFocusBack)

function keepFocusInside(event: KeyboardEvent) {
  const controls = Array.from(dialog.value?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
  const focused = (dialog.value?.getRootNode() as Document | ShadowRoot).activeElement
  const wrapTo = event.shiftKey
    ? focused === controls[0] && controls.at(-1)
    : focused === controls.at(-1) && controls[0]
  if (!wrapTo) return
  event.preventDefault()
  wrapTo.focus()
}

let pressStartedOutside = false
function notePressStart(event: PointerEvent) {
  pressStartedOutside = event.target === event.currentTarget
}
function closeOnClickOutside(event: MouseEvent) {
  if (event.target === event.currentTarget && pressStartedOutside) emit('close')
}
</script>

<template>
  <div v-if="open" class="n-dialog" @pointerdown="notePressStart" @click="closeOnClickOutside">
    <div
      ref="dialog"
      class="n-dialog__panel"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @keydown.esc="emit('close')"
      @keydown.tab="keepFocusInside"
    >
      <header class="n-dialog__header" role="none">
        <h2 :id="titleId" class="n-dialog__title">{{ title }}</h2>
        <NButton icon="close" :label="t('dialog.close')" @click="emit('close')" />
      </header>
      <component :is="form ? 'form' : 'div'" class="n-dialog__body" :novalidate="form || undefined" @submit.prevent="emit('submit')">
        <div ref="content" class="n-dialog__content">
          <slot />
        </div>
        <footer v-if="$slots.actions" class="n-dialog__actions" role="none">
          <slot name="actions" />
        </footer>
      </component>
    </div>
  </div>
</template>

<style scoped>
.n-dialog {
  box-sizing: border-box;
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: var(--n-scrim);
}

.n-dialog__panel {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 100%;
  overflow: hidden;
  border: 1px solid var(--n-line);
  border-radius: var(--n-radius-large);
  background: linear-gradient(var(--n-surface), var(--n-surface)), var(--n-app);
  box-shadow: var(--n-shadow-dialog);
  backdrop-filter: blur(30px) saturate(1.6);
}

.n-dialog__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px 8px;
}

.n-dialog__title {
  flex: 1;
  margin: 0;
  font-size: 18px;
  font-weight: var(--n-font-weight-strong);
  text-wrap: balance;
}

.n-dialog__body {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.n-dialog__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: auto;
  padding: 4px 14px 14px;
}

.n-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  padding: 10px 14px 12px;
  border-top: 1px solid var(--n-line);
}
</style>
