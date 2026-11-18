/** The version of the extension that runs, as its manifest gives it. */
export function readManifestVersion(): string {
  return browser.runtime.getManifest().version
}
