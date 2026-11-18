import { createPlaylist, currentFileAfterChange, nextFile, previousFile, withFileAdded, withFileMoved, withFileRemoved, withName, type AudioFile } from './playlist'

const rain: AudioFile = { id: 'rain', name: 'Rain.mp3' }
const waves: AudioFile = { id: 'waves', name: 'Waves.ogg' }
const piano: AudioFile = { id: 'piano', name: 'Piano.wav' }

function focus() {
  return createPlaylist({ id: 'focus', name: 'Focus' })
}

function focusWithThreeFiles() {
  return [rain, waves, piano].reduce(withFileAdded, focus())
}


describe('creating a playlist', () => {
  test('a new playlist keeps its id and name and has no files', () => {
    expect(createPlaylist({ id: 'focus', name: 'Focus' })).toEqual({ id: 'focus', name: 'Focus', files: [] })
  })

  test.each([
    ['empty', ''],
    ['only spaces', '   ']
  ])('a playlist whose name is %s is rejected', (_, name) => {
    expect(() => createPlaylist({ id: 'focus', name })).toThrow('name')
  })
})

describe('renaming a playlist', () => {
  test('a renamed playlist has the new name and the same id', () => {
    const renamed = withName(createPlaylist({ id: 'focus', name: 'Focus' }), 'Deep work')

    expect(renamed).toEqual({ id: 'focus', name: 'Deep work', files: [] })
  })

  test.each([
    ['empty', ''],
    ['only spaces', '   ']
  ])('renaming a playlist to a name that is %s is rejected', (_, name) => {
    expect(() => withName(createPlaylist({ id: 'focus', name: 'Focus' }), name)).toThrow('name')
  })
})

describe('adding a file', () => {
  test('an added file goes after the files already there', () => {
    const playlist = withFileAdded(withFileAdded(focus(), rain), waves)

    expect(playlist.files).toEqual([rain, waves])
  })

  test('a file already in the playlist is rejected', () => {
    const playlist = withFileAdded(focus(), rain)

    expect(() => withFileAdded(playlist, { id: 'rain', name: 'Rain again.mp3' })).toThrow('already')
  })

  test.each([
    ['empty', ''],
    ['only spaces', '   ']
  ])('a file whose name is %s is rejected', (_, name) => {
    expect(() => withFileAdded(focus(), { id: 'rain', name })).toThrow('name')
  })

  test.each([
    ['zero', 0],
    ['negative', -1000],
    ['not a number', NaN],
    ['infinite', Infinity]
  ])('a file whose length is %s is rejected', (_, length) => {
    expect(() => withFileAdded(focus(), { ...rain, length })).toThrow('length')
  })
})

describe('removing a file', () => {
  test('a removed file is gone and the others keep their order', () => {
    expect(withFileRemoved(focusWithThreeFiles(), 'waves').files).toEqual([rain, piano])
  })
})

describe('moving a file', () => {
  test('a file moved earlier plays before the files it passed', () => {
    expect(withFileMoved(focusWithThreeFiles(), 2, 0).files).toEqual([piano, rain, waves])
  })

  test.each([
    ['from before the first file', -1, 0],
    ['from after the last file', 3, 0],
    ['to before the first file', 0, -1],
    ['to after the last file', 0, 3],
    ['from a fraction', 0.5, 2]
  ])('moving %s changes nothing', (_, from, to) => {
    expect(withFileMoved(focusWithThreeFiles(), from, to).files).toEqual([rain, waves, piano])
  })
})

describe('going to the next file', () => {
  test('the next file is the one that follows', () => {
    expect(nextFile(focusWithThreeFiles(), 'rain')).toEqual(waves)
  })

  test('after the last file the playlist starts over with the first', () => {
    expect(nextFile(focusWithThreeFiles(), 'piano')).toEqual(rain)
  })
})

describe('going to the previous file', () => {
  test('the previous file is the one before', () => {
    expect(previousFile(focusWithThreeFiles(), 'piano')).toEqual(waves)
  })

  test('before the first file comes the last', () => {
    expect(previousFile(focusWithThreeFiles(), 'rain')).toEqual(piano)
  })
})

describe('going on from a file that is not in the playlist', () => {
  test.each([
    ['next', nextFile],
    ['previous', previousFile]
  ])('going to the %s file from a file that is not there starts with the first', (_, go) => {
    expect(go(focusWithThreeFiles(), 'thunder')).toEqual(rain)
  })
})

describe('the current file after the playlist changes', () => {
  test('a current file that was moved stays current', () => {
    const before = focusWithThreeFiles()

    expect(currentFileAfterChange(before, withFileMoved(before, 0, 2), 'rain')).toEqual(rain)
  })

  test('when the current file is removed, the file that followed it becomes current', () => {
    const before = focusWithThreeFiles()

    expect(currentFileAfterChange(before, withFileRemoved(before, 'waves'), 'waves')).toEqual(piano)
  })

  test('when the current file was the last and is removed, the first file becomes current', () => {
    const before = focusWithThreeFiles()

    expect(currentFileAfterChange(before, withFileRemoved(before, 'piano'), 'piano')).toEqual(rain)
  })

  test('when the only file is removed, no file is current', () => {
    const before = withFileAdded(focus(), rain)

    expect(currentFileAfterChange(before, withFileRemoved(before, 'rain'), 'rain')).toBeNull()
  })
})
