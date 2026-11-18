import { createBrowserAudioFileStore } from '@/infrastructure/browser/audio-file-store'
import { answerAsOffscreenPlayer } from '@/infrastructure/browser/offscreen-player'
import { createPagePlayer } from '@/infrastructure/browser/page-player'

answerAsOffscreenPlayer(createPagePlayer({ audioFiles: createBrowserAudioFileStore() }))
