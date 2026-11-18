import type { InjectionKey } from 'vue'

/** Reads the version of the extension, as its manifest gives it, for example `1.0.0`. */
export type ExtensionVersion = () => string

const extensionVersionKey: InjectionKey<ExtensionVersion> = Symbol('extension version')

/** Gives every component below this one the version of the extension, from the manifest or a fixed one. */
export function provideExtensionVersion(read: ExtensionVersion): void {
  provide(extensionVersionKey, read)
}

export function useExtensionVersion(): string {
  const read = inject(extensionVersionKey)
  if (!read) throw new Error('useExtensionVersion needs provideExtensionVersion in an ancestor component')
  return read()
}
