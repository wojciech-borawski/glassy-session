import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createBrowserSoundSettingsStore } from './sound-settings-store'

beforeEach(() => {
  fakeBrowser.reset()
})

describe('the saved sound settings', () => {
  test('before anything is saved, the end chime is the marimba, the start chime the soft chime, and rings and chimes play at 80 percent', async () => {
    expect(await createBrowserSoundSettingsStore().load()).toEqual({
      endChime: { kind: 'built-in', name: 'marimba' },
      startChime: { kind: 'built-in', name: 'soft chime' },
      volume: 0.8
    })
  })

  test('saved settings read back as they were saved', async () => {
    const settings = { endChime: { kind: 'audio file', fileId: 'gong' }, startChime: { kind: 'built-in', name: 'digital' }, volume: 0.3 } as const
    const store = createBrowserSoundSettingsStore()

    await store.save(settings)

    expect(await store.load()).toEqual(settings)
  })

  test('each saved setting this version does not have falls back to its default, and the others are kept', async () => {
    await fakeBrowser.storage.local.set({ soundSettings: { endChime: { kind: 'built-in', name: 'gong' }, startChime: { kind: 'audio file', fileId: 'birds' }, volume: 3 } })

    expect(await createBrowserSoundSettingsStore().load()).toEqual({
      endChime: { kind: 'built-in', name: 'marimba' },
      startChime: { kind: 'audio file', fileId: 'birds' },
      volume: 0.8
    })
  })
})
