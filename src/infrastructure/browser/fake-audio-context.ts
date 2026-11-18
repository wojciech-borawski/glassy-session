type FakeParam = { value: number, setValueAtTime(): void, linearRampToValueAtTime(): void, exponentialRampToValueAtTime(): void }

type FakeNode = { connect<Node>(node: Node): Node }

/** What a fake audio context was asked to sound: each wave and each decoded file it started, and the volume of each output. */
export type Sounded = {
  waves: { frequency: number, wave: string, from: number }[]
  files: { bytes: number[], from: number }[]
  /** The gain of each node connected straight to the speakers. */
  volumes: number[]
}

/**
 * A stand-in for the Web Audio API, which happy-dom lacks, recording what is started on it.
 * It starts suspended, as a context created without a click does, and sounds nothing until it is resumed.
 * It decodes any bytes but empty ones into a buffer that remembers them, as a real context fails on bytes that are no audio.
 */
export function createFakeAudioContext(): { sounded: Sounded, created: () => number, factory: () => AudioContext } {
  const sounded: Sounded = { waves: [], files: [], volumes: [] }
  let createdCount = 0
  const destination = {}
  const param = (value = 1): FakeParam => ({ value, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} })
  const node = (onConnect: (target: unknown) => void = () => {}): FakeNode => ({
    connect(target) {
      onConnect(target)
      return target
    }
  })
  const context = {
    state: 'suspended' as AudioContextState,
    currentTime: 10,
    destination,
    async resume() {
      context.state = 'running'
    },
    createGain() {
      const gain = { ...node((target) => target === destination && sounded.volumes.push(gain.gain.value)), gain: param() }
      return gain
    },
    createOscillator() {
      const oscillator = {
        ...node(),
        type: 'sine',
        frequency: param(440),
        start(from: number) {
          if (context.state !== 'running') {
            return
          }
          sounded.waves.push({ frequency: oscillator.frequency.value, wave: oscillator.type, from })
        },
        stop() {}
      }
      return oscillator
    },
    async decodeAudioData(bytes: ArrayBuffer) {
      if (bytes.byteLength === 0) {
        throw new DOMException('Unable to decode audio data', 'EncodingError')
      }
      return { bytes: [...new Uint8Array(bytes)] }
    },
    createBufferSource() {
      const source = {
        ...node(),
        buffer: null as { bytes: number[] } | null,
        start(from: number) {
          if (context.state !== 'running') {
            return
          }
          sounded.files.push({ bytes: source.buffer?.bytes ?? [], from })
        }
      }
      return source
    }
  }
  const factory = () => {
    createdCount++
    return context as unknown as AudioContext
  }
  return { sounded, created: () => createdCount, factory }
}
