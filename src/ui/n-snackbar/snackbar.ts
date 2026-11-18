import { inject, provide, readonly, shallowRef, type InjectionKey, type Ref } from 'vue'

export type SnackbarMessage = Readonly<{ id: number, text: string }>

export type Snackbar = Readonly<{
  /** The messages showing now, oldest first. */
  messages: Readonly<Ref<readonly SnackbarMessage[]>>
  show(text: string): void
}>

/** How long a message shows. */
const SHOWN_FOR = 4_000

const snackbarKey: InjectionKey<Snackbar> = Symbol('snackbar')

/** Gives every component below this one a snackbar to show short messages in. Each message goes away after four seconds. */
export function provideSnackbar(): Snackbar {
  const messages = shallowRef<readonly SnackbarMessage[]>([])
  let lastId = 0
  const snackbar: Snackbar = {
    messages: readonly(messages),
    show(text) {
      lastId += 1
      const id = lastId
      messages.value = [...messages.value, { id, text }]
      setTimeout(() => {
        messages.value = messages.value.filter((message) => message.id !== id)
      }, SHOWN_FOR)
    }
  }
  provide(snackbarKey, snackbar)
  return snackbar
}

export function useSnackbar(): Snackbar {
  const snackbar = inject(snackbarKey)
  if (!snackbar) throw new Error('useSnackbar needs provideSnackbar in an ancestor component')
  return snackbar
}
