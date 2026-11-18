import type { Duration } from '@/utils/time/units'

/** How long to wait for a file's metadata before taking it as not audio. */
const METADATA_TIMEOUT = 10_000

/**
 * How long the file plays, read from the metadata an Audio element loads, so it works only where there is a DOM, such as the popup.
 * Resolves with undefined for audio whose length the browser cannot tell, and with null when the file cannot be read as audio.
 */
export function readAudioLength(file: Blob): Promise<Duration | undefined | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    const finish = (length: Duration | undefined | null) => {
      clearTimeout(timeout)
      audio.removeAttribute('src')
      URL.revokeObjectURL(url)
      resolve(length)
    }
    const timeout = setTimeout(() => finish(null), METADATA_TIMEOUT)
    audio.preload = 'metadata'
    audio.addEventListener('loadedmetadata', () => finish(Number.isFinite(audio.duration) && audio.duration > 0 ? Math.round(audio.duration * 1000) : undefined), { once: true })
    audio.addEventListener('error', () => finish(null), { once: true })
    audio.src = url
  })
}
