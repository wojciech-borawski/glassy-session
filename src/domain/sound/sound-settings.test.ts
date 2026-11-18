import { fireEvent, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { defineComponent, h } from 'vue'
import { createMemorySounds } from '@/infrastructure/memory/sounds'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import SoundSettings from './sound-settings.vue'
import { provideSounds, type Sounds } from './sounds'

const saved = { endChime: { kind: 'built-in', name: 'marimba' }, startChime: { kind: 'built-in', name: 'soft chime' }, volume: 0.6 } as const

function renderSettings(sounds: Sounds) {
  render(defineComponent({
    setup() {
      provideSounds(sounds)
      return () => h(SoundSettings)
    }
  }), { global: { plugins: [createAppI18n()] } })
}

describe('the sound settings', () => {
  test('show the saved end chime, start chime and volume, and save the end chime chosen next', async () => {
    const sounds = createMemorySounds(saved)
    renderSettings(sounds)

    const endChime = await screen.findByRole('combobox', { name: 'End chime' })
    expect(endChime).toHaveDisplayValue('Marimba')
    expect(screen.getByRole('combobox', { name: 'Start chime' })).toHaveDisplayValue('Soft chime')
    expect(screen.getByRole('slider', { name: 'Volume of rings and chimes' })).toHaveValue('0.6')

    await userEvent.selectOptions(endChime, 'Digital')

    await waitFor(async () => expect(await sounds.soundSettings.load()).toEqual({ ...saved, endChime: { kind: 'built-in', name: 'digital' } }))
    expect(endChime).toHaveDisplayValue('Digital')
  })

  test('save the volume set for rings and chimes, and preview the chimes at it', async () => {
    const sounds = createMemorySounds(saved)
    renderSettings(sounds)

    await fireEvent.update(await screen.findByRole('slider', { name: 'Volume of rings and chimes' }), '0.25')
    await userEvent.click(screen.getByRole('button', { name: 'Preview Start chime' }))

    await waitFor(async () => expect(await sounds.soundSettings.load()).toEqual({ ...saved, volume: 0.25 }))
    expect(sounds.player.played).toEqual([{ sound: { kind: 'built-in', name: 'soft chime' }, volume: 0.25 }])
  })
})
