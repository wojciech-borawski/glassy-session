import { fireEvent, render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createAppI18n } from '@/infrastructure/plugins/setup-i18n'
import type { Playlist } from './model/playlist'
import PlaylistCard from './playlist-card.vue'

const rain = { id: 'rain', name: 'rain.mp3', length: 185_000 }
const waves = { id: 'waves', name: 'waves.ogg', length: 3_725_000 }
const birds = { id: 'birds', name: 'birds.wav' }

const focusMix: Playlist = { id: 'focus-mix', name: 'Focus mix', files: [rain, waves, birds] }

function renderCard(playlist: Playlist = focusMix, usedBy: readonly string[] = []) {
  return render(PlaylistCard, { props: { playlist, usedBy }, global: { plugins: [createAppI18n()] } })
}

const rows = () => within(screen.getByRole('list', { name: 'Files in Focus mix' })).getAllByRole('listitem')

describe('a playlist card', () => {
  test('is named after the playlist and lists its files in order, each with its place, its name and its length once known', () => {
    renderCard()

    expect(screen.getByRole('article', { name: 'Focus mix' })).toBeInTheDocument()
    expect(rows().map((row) => within(row).getAllByText(/./).map((part) => part.textContent))).toEqual([
      ['1', 'rain.mp3', '03:05'],
      ['2', 'waves.ogg', '1:02:05'],
      ['3', 'birds.wav']
    ])
  })

  test('says when it has no files yet and nothing uses it', () => {
    renderCard({ ...focusMix, files: [] })

    expect(screen.queryByRole('list', { name: 'Files in Focus mix' })).not.toBeInTheDocument()
    expect(screen.getByText('No files yet.')).toBeInTheDocument()
    expect(screen.getByText('Not used yet')).toBeInTheDocument()
  })

  test('names the timers and focus sessions that use it', () => {
    renderCard(focusMix, ['Pasta', 'Morning'])

    expect(screen.getByText('Used by Pasta, Morning')).toBeInTheDocument()
  })
})

describe('changing a playlist on its card', () => {
  test('the delete button names the playlist and asks to delete it', async () => {
    const { emitted } = renderCard()

    await userEvent.click(screen.getByRole('button', { name: 'Delete Focus mix' }))

    expect(emitted('remove')).toEqual([[]])
  })

  test('each file has a button that names it and asks to remove it from the playlist', async () => {
    const { emitted } = renderCard()

    await userEvent.click(screen.getByRole('button', { name: 'Remove waves.ogg from Focus mix' }))

    expect(emitted('removeFile')).toEqual([[waves]])
  })
})

describe('adding files to a playlist', () => {
  const chooser = () => screen.getByLabelText<HTMLInputElement>('Choose audio files for Focus mix')
  const picked = [new File(['birds'], 'birds.wav', { type: 'audio/wav' }), new File(['rain'], 'rain.mp3', { type: 'audio/mpeg' })]

  test('the add button opens a chooser for several audio files', async () => {
    renderCard()
    const opened = vi.spyOn(chooser(), 'click')

    await userEvent.click(screen.getByRole('button', { name: 'Add files to Focus mix' }))

    expect(opened).toHaveBeenCalledOnce()
    expect(chooser()).toHaveAttribute('accept', 'audio/*')
    expect(chooser()).toHaveAttribute('multiple')
  })

  test('the files chosen are asked to be added in the order chosen, and the chooser is emptied so the same file can be chosen again', async () => {
    const { emitted } = renderCard()

    await userEvent.upload(chooser(), picked)

    expect(emitted('addFiles')).toEqual([[picked]])
    expect(chooser()).toHaveValue('')
  })
})

describe('moving files in a playlist', () => {
  test('moves a file one place earlier or later with buttons that name it, and offers no move past either end', async () => {
    const { emitted } = renderCard()

    await userEvent.click(screen.getByRole('button', { name: 'Move waves.ogg earlier' }))
    await userEvent.click(screen.getByRole('button', { name: 'Move rain.mp3 later' }))

    expect(emitted('moveFile')).toEqual([[1, 0], [0, 1]])
    expect(screen.getByRole('button', { name: 'Move rain.mp3 earlier' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move birds.wav later' })).toBeDisabled()
  })

  test('keeps focus on the file that was moved once the playlist has changed, on its other move button when the first can no longer move it', async () => {
    const { rerender } = renderCard()
    const press = async (name: string) => {
      screen.getByRole('button', { name }).focus()
      await userEvent.keyboard('{Enter}')
    }

    await press('Move birds.wav earlier')
    await rerender({ playlist: { ...focusMix, files: [rain, birds, waves] }, usedBy: [] })
    expect(screen.getByRole('button', { name: 'Move birds.wav earlier' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await rerender({ playlist: { ...focusMix, files: [birds, rain, waves] }, usedBy: [] })

    expect(screen.getByRole('button', { name: 'Move birds.wav later' })).toHaveFocus()
  })

  test('moves a file dragged onto another file to the place of that file', async () => {
    const { emitted } = renderCard()
    const [first, , last] = rows() as [HTMLElement, HTMLElement, HTMLElement]

    await fireEvent.dragStart(last)
    await fireEvent.dragOver(first)
    await fireEvent.drop(first)

    expect(emitted('moveFile')).toEqual([[2, 0]])
  })

  test('moves nothing when a drag ends without a drop, as when it is let go outside the list or Escape cancels it', async () => {
    const { emitted } = renderCard()
    const [first, , last] = rows() as [HTMLElement, HTMLElement, HTMLElement]

    await fireEvent.dragStart(last)
    await fireEvent.dragEnd(last)
    await fireEvent.dragOver(first)
    await fireEvent.drop(first)

    expect(emitted('moveFile')).toBeUndefined()
  })

  test('moves nothing when a file is dropped onto itself', async () => {
    const { emitted } = renderCard()
    const [, middle] = rows() as [HTMLElement, HTMLElement, HTMLElement]

    await fireEvent.dragStart(middle)
    await fireEvent.drop(middle)

    expect(emitted('moveFile')).toBeUndefined()
  })

  test('moves nothing when the dragged file was removed from the playlist before the drop', async () => {
    const { emitted, rerender } = renderCard()
    const [first] = rows() as [HTMLElement]

    await fireEvent.dragStart(first)
    await rerender({ playlist: { ...focusMix, files: [waves, birds] }, usedBy: [] })
    await fireEvent.drop(rows()[1] as HTMLElement)

    expect(emitted('moveFile')).toBeUndefined()
  })
})

describe('renaming a playlist on its card', () => {
  const nameField = () => screen.getByRole('textbox', { name: 'Name of Focus mix' })

  test('a name typed into its field and confirmed with Enter is sent once, without the spaces around it', async () => {
    const { emitted } = renderCard()

    await userEvent.clear(nameField())
    await userEvent.type(nameField(), '  Deep focus {Enter}')
    await userEvent.tab()

    expect(emitted('rename')).toEqual([['Deep focus']])
  })

  test('a name typed into its field is sent when the field is left', async () => {
    const { emitted } = renderCard()

    await userEvent.clear(nameField())
    await userEvent.type(nameField(), 'Deep focus')
    await userEvent.tab()

    expect(emitted('rename')).toEqual([['Deep focus']])
  })

  test('a field left blank, or with the name unchanged, sends nothing and shows the stored name again', async () => {
    const { emitted } = renderCard()

    await userEvent.clear(nameField())
    await userEvent.type(nameField(), '   ')
    await userEvent.tab()
    await userEvent.click(nameField())
    await userEvent.tab()

    expect(emitted('rename')).toBeUndefined()
    expect(nameField()).toHaveValue('Focus mix')
  })

  test('Escape undoes what was typed, and leaving the field then sends nothing', async () => {
    const { emitted } = renderCard()

    await userEvent.type(nameField(), ' and more{Escape}')
    await userEvent.tab()

    expect(nameField()).toHaveValue('Focus mix')
    expect(emitted('rename')).toBeUndefined()
  })

  test('the field follows a name the playlist got elsewhere', async () => {
    const { rerender } = renderCard()

    await rerender({ playlist: { ...focusMix, name: 'Deep focus' }, usedBy: [] })

    expect(screen.getByRole('textbox', { name: 'Name of Deep focus' })).toHaveValue('Deep focus')
  })
})
