import { fireEvent, render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import BackgroundSoundFields from './background-sound-fields.vue'
import type { BackgroundSound } from './model/background-sound'
import type { Playlist } from './model/playlist'

const focusMix: Playlist = { id: 'focus-mix', name: 'Focus mix', files: [] }
const rainyDay: Playlist = { id: 'rainy-day', name: 'Rainy day', files: [] }

function renderFields(modelValue: BackgroundSound, playlists: readonly Playlist[] = [focusMix, rainyDay]) {
  return render(BackgroundSoundFields, { props: { playlists, modelValue }, global: { plugins: [createAppI18n()] } })
}

const group = () => screen.getByRole('group', { name: 'Background sound' })
const playlist = () => within(group()).getByRole('combobox', { name: 'Playlist' })
const volume = () => within(group()).getByRole('slider', { name: 'Volume' })

describe('the background sound fields', () => {
  test('offer none or any stored playlist, in their order, and show the one chosen', () => {
    renderFields({ playlistId: 'rainy-day', volume: 0.5 })

    expect(within(playlist()).getAllByRole('option').map((option) => option.textContent?.trim())).toEqual(['None', 'Focus mix', 'Rainy day'])
    expect(playlist()).toHaveDisplayValue('Rainy day')
  })

  test('choosing a playlist keeps the volume', async () => {
    const { emitted } = renderFields({ playlistId: null, volume: 0.3 })

    await userEvent.selectOptions(playlist(), 'Focus mix')

    expect(emitted('update:modelValue')).toEqual([[{ playlistId: 'focus-mix', volume: 0.3 }]])
  })

  test('choosing none keeps the volume for when a playlist is chosen again', async () => {
    const { emitted } = renderFields({ playlistId: 'focus-mix', volume: 0.3 })

    await userEvent.selectOptions(playlist(), 'None')

    expect(emitted('update:modelValue')).toEqual([[{ playlistId: null, volume: 0.3 }]])
  })

  test('show the volume in percent and change it in steps of five, keeping the playlist', async () => {
    const { emitted } = renderFields({ playlistId: 'focus-mix', volume: 0.3 })

    expect(volume()).toHaveValue('30')
    expect(volume()).toHaveAttribute('step', '5')
    expect(within(group()).getByText('30%')).toBeInTheDocument()
    await fireEvent.update(volume(), '45')

    expect(emitted('update:modelValue')).toEqual([[{ playlistId: 'focus-mix', volume: 0.45 }]])
  })

  test('keep the volume ready to change while no playlist is chosen, so it is set for the next one chosen', async () => {
    const { emitted } = renderFields({ playlistId: null, volume: 0.3 })

    expect(volume()).toBeEnabled()
    await fireEvent.update(volume(), '60')

    expect(emitted('update:modelValue')).toEqual([[{ playlistId: null, volume: 0.6 }]])
  })

  test('say where playlists are made when there are none to choose', () => {
    renderFields({ playlistId: null, volume: 0.5 }, [])

    expect(within(group()).getByText('Make a playlist in Music to choose it here.')).toBeInTheDocument()
  })
})
