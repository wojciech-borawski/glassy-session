import { fakeBrowser } from 'wxt/testing/fake-browser'
import type { SoundPlayer } from '@/domain/sound/ports'
import { createMemorySoundPlayer, type MemorySoundPlayer } from '../memory/sound-player'
import { answerAsOffscreenPlayer } from './offscreen-player'

type OffscreenOptions = Parameters<typeof browser.offscreen.createDocument>[0]

/**
 * Stands in for Chromium's offscreen API, which the fake browser lacks: one document at most, open from the start or not,
 * which answers as the offscreen player over an in-memory player once it opens. Set it up after `fakeBrowser.reset()`.
 * Closing the document, as Chromium does after 30 seconds of silence, loses its player, and the next document opened starts with a new one.
 */
export function fakeOffscreen({ open = false } = {}) {
  const created: OffscreenOptions[] = []
  const endedListeners: ((fileId: string) => void)[] = []
  const placeListeners: ((fileId: string, at: number) => void)[] = []
  const cannotPlayListeners: ((fileId: string) => void)[] = []
  const filesPlayed: string[] = []
  let current: MemorySoundPlayer = createMemorySoundPlayer()
  let isOpen = false
  let answering = false
  /** The one player the document answers with, playing on the player of whichever document is open. */
  const inOpenDocument: SoundPlayer = {
    playOnce: (sound, volume) => current.playOnce(sound, volume),
    playFile: (fileId, from, volume) => {
      filesPlayed.push(fileId)
      return current.playFile(fileId, from, volume)
    },
    pauseFile: () => current.pauseFile(),
    stopFile: () => current.stopFile(),
    setFileVolume: (volume) => current.setFileVolume(volume),
    fileCued: () => current.fileCued(),
    onFileEnded: (listener) => endedListeners.push(listener),
    onFilePlace: (listener) => placeListeners.push(listener),
    onFileCannotPlay: (listener) => cannotPlayListeners.push(listener)
  }
  const openDocument = () => {
    isOpen = true
    current = createMemorySoundPlayer()
    current.onFileEnded((fileId) => endedListeners.forEach((listener) => listener(fileId)))
    current.onFilePlace((fileId, at) => placeListeners.forEach((listener) => listener(fileId, at)))
    current.onFileCannotPlay((fileId) => cannotPlayListeners.forEach((listener) => listener(fileId)))
    if (!answering) {
      answering = true
      answerAsOffscreenPlayer(inOpenDocument)
    }
  }
  if (open) {
    openDocument()
  }
  fakeBrowser.runtime.getContexts = (async () => isOpen ? [{ contextType: 'OFFSCREEN_DOCUMENT' }] : []) as unknown as typeof fakeBrowser.runtime.getContexts
  fakeBrowser.offscreen.createDocument = (async (options: OffscreenOptions) => {
    if (isOpen) {
      throw new Error('Only a single offscreen document may be created.')
    }
    created.push(options)
    openDocument()
  }) as unknown as typeof fakeBrowser.offscreen.createDocument
  return {
    created,
    /** The id of each file any document was told to play, in order. */
    filesPlayed,
    /** The player of the document open now, or of the last one that was. */
    playerInDocument: () => current,
    isOpen: () => isOpen,
    close() {
      isOpen = false
      current = createMemorySoundPlayer()
    }
  }
}
