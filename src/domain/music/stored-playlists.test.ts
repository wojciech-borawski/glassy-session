import { render, screen } from '@testing-library/vue'
import { defineComponent, h } from 'vue'
import { createMemoryStoredPlaylists } from '@/infrastructure/memory/stored-playlists'
import { provideStoredPlaylists, useStoredPlaylists } from './stored-playlists'

const PlaylistNames = defineComponent({
  setup() {
    const { playlists } = useStoredPlaylists()
    return () => h('p', playlists.value.map((playlist) => playlist.name).join(', '))
  }
})

describe('giving components the stored playlists', () => {
  test('a component below the one that provides the stored playlists gets them', () => {
    const Provider = defineComponent({
      setup() {
        provideStoredPlaylists(createMemoryStoredPlaylists({ playlists: [{ id: 'focus-mix', name: 'Focus mix', files: [] }], backgroundSounds: [] }))
        return () => h(PlaylistNames)
      }
    })

    render(Provider)

    expect(screen.getByText('Focus mix')).toBeInTheDocument()
  })

  test('a component with no provider above it is told what is missing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(() => render(PlaylistNames)).toThrow('useStoredPlaylists needs provideStoredPlaylists in an ancestor component')
  })
})
