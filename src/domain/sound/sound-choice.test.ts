import { render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { defineComponent, h } from 'vue'
import { createMemorySounds } from '@/infrastructure/memory/sounds'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import type { Sound } from './model/sound'
import SoundChoice from './sound-choice.vue'
import { provideSounds, type Sounds } from './sounds'

function renderChoice(sounds: Sounds, props: { modelValue: Sound }) {
  const changes: Sound[] = []
  render(defineComponent({
    setup() {
      provideSounds(sounds)
      return () => h(SoundChoice, { label: 'Ring sound', ...props, 'onUpdate:modelValue': (sound: Sound) => changes.push(sound) })
    }
  }), { global: { plugins: [createAppI18n()] } })
  return changes
}

describe('the sound choice', () => {
  test('offers the built-in sounds and the person\'s own audio files, says which is chosen, and gives the one chosen next', async () => {
    const sounds = createMemorySounds()
    await sounds.audioFiles.save({ name: 'gong.mp3', type: 'audio/mpeg', bytes: new ArrayBuffer(4) })
    const changes = renderChoice(sounds, { modelValue: { kind: 'built-in', name: 'bell' } })
    const choice = screen.getByRole('combobox', { name: 'Ring sound' })

    await waitFor(() => expect(screen.getAllByRole('option').map((option) => option.textContent?.trim())).toEqual(['Bell', 'Soft chime', 'Digital', 'Marimba', 'gong.mp3']))
    expect(choice).toHaveDisplayValue('Bell')

    await userEvent.selectOptions(choice, 'gong.mp3')

    expect(changes).toEqual([{ kind: 'audio file', fileId: '1' }])
  })

  test('previews the chosen sound once, at the volume set for rings and chimes', async () => {
    const sounds = createMemorySounds({ endChime: { kind: 'built-in', name: 'bell' }, startChime: { kind: 'built-in', name: 'bell' }, volume: 0.4 })
    renderChoice(sounds, { modelValue: { kind: 'built-in', name: 'marimba' } })

    await userEvent.click(screen.getByRole('button', { name: 'Preview Ring sound' }))

    await waitFor(() => expect(sounds.player.played).toEqual([{ sound: { kind: 'built-in', name: 'marimba' }, volume: 0.4 }]))
  })

  test('an audio file the person picks from their computer is kept once and chosen', async () => {
    const sounds = createMemorySounds()
    const changes = renderChoice(sounds, { modelValue: { kind: 'built-in', name: 'bell' } })

    await userEvent.upload(screen.getByLabelText('Own audio file for Ring sound'), new File([new Uint8Array([1, 2, 3])], 'gong.mp3', { type: 'audio/mpeg' }))

    await waitFor(() => expect(changes).toEqual([{ kind: 'audio file', fileId: '1' }]))
    expect(await sounds.audioFiles.read('1')).toEqual({ name: 'gong.mp3', type: 'audio/mpeg', bytes: new Uint8Array([1, 2, 3]).buffer })
    expect(screen.getByRole('option', { name: 'gong.mp3' })).toBeInTheDocument()
  })

  test('a chosen audio file that is no longer kept shows as gone, ringing with the bell', async () => {
    renderChoice(createMemorySounds(), { modelValue: { kind: 'audio file', fileId: 'removed' } })

    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Ring sound' })).toHaveDisplayValue('Audio file gone, rings with the bell'))
  })
})
