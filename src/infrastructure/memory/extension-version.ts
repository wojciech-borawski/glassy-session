/** A version that stays as given, for Storybook and component tests, which have no manifest. */
export function createFixedVersion(version = '1.0.0'): () => string {
  return () => version
}
