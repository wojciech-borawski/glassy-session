/** What a test sees of one fake audio element: what it was given, whether it plays, and a way to end it. */
export type FakeAudio = {
  src: string
  /** How far into its file it is, in seconds, as on a real element. */
  currentTime: number
  volume: number
  paused: boolean
  /** Plays the file to its end, as a real element does once it runs out. */
  end(): void
  /** Fails to play the file, as a real element does with content it cannot decode. */
  fail(): void
}

/**
 * Stand-ins for audio elements, which happy-dom has but cannot play, recording each one made in order.
 * Each one plays from the moment `play()` is called until it is paused or ended.
 */
export function createFakeAudioElements(): { made: FakeAudio[], factory: () => HTMLAudioElement } {
  const made: FakeAudio[] = []
  const factory = () => {
    const listeners = new Map<string, (() => void)[]>()
    const audio = {
      src: '',
      currentTime: 0,
      volume: 1,
      paused: true,
      async play() {
        audio.paused = false
      },
      pause() {
        audio.paused = true
      },
      removeAttribute(name: string) {
        if (name === 'src') {
          audio.src = ''
        }
      },
      addEventListener(type: string, listener: () => void) {
        listeners.set(type, [...listeners.get(type) ?? [], listener])
      },
      end() {
        audio.paused = true
        listeners.get('ended')?.forEach((listener) => listener())
      },
      fail() {
        audio.paused = true
        listeners.get('error')?.forEach((listener) => listener())
      }
    }
    made.push(audio)
    return audio as unknown as HTMLAudioElement
  }
  return { made, factory }
}
