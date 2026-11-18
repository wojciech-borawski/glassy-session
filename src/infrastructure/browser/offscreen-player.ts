import type { Sound, Volume } from '@/domain/sound/model/sound'
import type { SoundPlayer } from '@/domain/sound/ports'
import { isRecord } from '@/utils/is-record'
import type { Duration } from '@/utils/time/units'

const DOCUMENT_PATH = '/offscreen.html'

/** What the background asks the offscreen document to do on its player. */
type PlayerMessage = Readonly<{ to: 'offscreen player' } & (
  | { do: 'play once', sound: Sound, volume: Volume }
  | { do: 'play file', fileId: string, from: Duration, volume: Volume }
  | { do: 'pause file' | 'stop file' | 'file cued' }
  | { do: 'set file volume', volume: Volume }
)>

/** What the offscreen document tells the background when a file played to its end. */
type FileEndedReport = Readonly<{ from: 'offscreen player', fileEnded: string }>

/** What the offscreen document tells the background when a file it was told to play cannot play. */
type FileCannotPlayReport = Readonly<{ from: 'offscreen player', fileCannotPlay: string }>

/** What the offscreen document tells the background every 15 seconds while a file plays: how far into it it got. */
type FilePlaceReport = Readonly<{ from: 'offscreen player', fileAt: string, at: Duration }>

function isFileEndedReport(message: unknown): message is FileEndedReport {
  return isRecord(message) && message.from === 'offscreen player' && typeof message.fileEnded === 'string'
}

function isFileCannotPlayReport(message: unknown): message is FileCannotPlayReport {
  return isRecord(message) && message.from === 'offscreen player' && typeof message.fileCannotPlay === 'string'
}

function isFilePlaceReport(message: unknown): message is FilePlaceReport {
  return isRecord(message) && message.from === 'offscreen player' && typeof message.fileAt === 'string' && typeof message.at === 'number'
}

function isPlayerMessage(message: unknown): message is PlayerMessage {
  return isRecord(message) && message.to === 'offscreen player'
}

const documentUrl = () => browser.runtime.getURL(DOCUMENT_PATH)

async function isDocumentOpen(): Promise<boolean> {
  const open = await browser.runtime.getContexts({ contextTypes: [browser.runtime.ContextType.OFFSCREEN_DOCUMENT], documentUrls: [documentUrl()] })
  return open.length > 0
}

async function openDocument() {
  if (await isDocumentOpen()) {
    return
  }
  await browser.offscreen.createDocument({
    url: documentUrl(),
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Plays the ring sounds of timers and alarms, the chimes of focus sessions, and the background sounds of timers and focus sessions.'
  })
}

/**
 * Plays from the Chromium service worker, which cannot play audio itself, by handing each sound to the offscreen document.
 * Chromium closes that document after 30 seconds without audio, so it is opened again whenever it is not open.
 * Sounds played while it is being opened wait for that one opening, since Chromium allows a single offscreen document.
 */
export function createOffscreenPlayer(): SoundPlayer {
  let opening: Promise<void> | null = null
  const documentOpened = () => opening ??= openDocument().finally(() => { opening = null })
  async function tell(message: PlayerMessage): Promise<unknown> {
    await documentOpened()
    return browser.runtime.sendMessage(message)
  }
  /** Tells the document only when it is open, since a document that is not open plays no file. Gives null otherwise. */
  async function tellIfOpen(message: PlayerMessage): Promise<unknown> {
    await opening
    return await isDocumentOpen() ? browser.runtime.sendMessage(message) : null
  }
  return {
    async playOnce(sound, volume) {
      await tell({ to: 'offscreen player', do: 'play once', sound, volume })
    },
    async playFile(fileId, from, volume) {
      await tell({ to: 'offscreen player', do: 'play file', fileId, from, volume })
    },
    async pauseFile() {
      const at: unknown = await tellIfOpen({ to: 'offscreen player', do: 'pause file' })
      return typeof at === 'number' ? at : null
    },
    async stopFile() {
      await tellIfOpen({ to: 'offscreen player', do: 'stop file' })
    },
    async setFileVolume(volume) {
      await tellIfOpen({ to: 'offscreen player', do: 'set file volume', volume })
    },
    async fileCued() {
      const fileId: unknown = await tellIfOpen({ to: 'offscreen player', do: 'file cued' })
      return typeof fileId === 'string' ? fileId : null
    },
    onFileEnded(listener) {
      browser.runtime.onMessage.addListener((message) => {
        if (isFileEndedReport(message)) {
          listener(message.fileEnded)
        }
      })
    },
    onFilePlace(listener) {
      browser.runtime.onMessage.addListener((message) => {
        if (isFilePlaceReport(message)) {
          listener(message.fileAt, message.at)
        }
      })
    },
    onFileCannotPlay(listener) {
      browser.runtime.onMessage.addListener((message) => {
        if (isFileCannotPlayReport(message)) {
          listener(message.fileCannotPlay)
        }
      })
    }
  }
}

function answer(player: SoundPlayer, message: PlayerMessage): Promise<unknown> {
  switch (message.do) {
  case 'play once':
    return player.playOnce(message.sound, message.volume).then(() => null)
  case 'play file':
    return player.playFile(message.fileId, message.from, message.volume).then(() => null)
  case 'pause file':
    return player.pauseFile()
  case 'stop file':
    return player.stopFile().then(() => null)
  case 'set file volume':
    return player.setFileVolume(message.volume).then(() => null)
  case 'file cued':
    return player.fileCued()
  }
}

/**
 * Has the offscreen document play what the background asks for on the player, and tell the background each file that plays to its end,
 * each file that cannot play, and how far into the file playing the player got each time it says.
 * Every other message is left for others to answer.
 */
export function answerAsOffscreenPlayer(player: SoundPlayer): void {
  player.onFileEnded((fileId) => {
    const report: FileEndedReport = { from: 'offscreen player', fileEnded: fileId }
    browser.runtime.sendMessage(report).catch((error: unknown) => console.error(error))
  })
  player.onFileCannotPlay((fileId) => {
    const report: FileCannotPlayReport = { from: 'offscreen player', fileCannotPlay: fileId }
    browser.runtime.sendMessage(report).catch((error: unknown) => console.error(error))
  })
  player.onFilePlace((fileId, at) => {
    const report: FilePlaceReport = { from: 'offscreen player', fileAt: fileId, at }
    browser.runtime.sendMessage(report).catch((error: unknown) => console.error(error))
  })
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isPlayerMessage(message)) {
      return
    }
    void answer(player, message).then(sendResponse, (error: unknown) => {
      console.error(error)
      sendResponse(null)
    })
    return true
  })
}
