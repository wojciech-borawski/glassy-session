import { isMusicCommand, isSoundCommand } from './commands'

const rain = { id: 'rain', name: 'rain.mp3', length: 180_000 }

describe('a music command', () => {
  test.each([
    ['adding a playlist', { type: 'addPlaylist', playlist: { id: 'focus-mix', name: 'Focus mix' } }],
    ['renaming a playlist', { type: 'renamePlaylist', playlistId: 'focus-mix', name: 'Deep focus' }],
    ['adding files to a playlist', { type: 'addFiles', playlistId: 'focus-mix', files: [rain, { id: 'birds', name: 'birds.wav' }] }],
    ['removing a file from a playlist', { type: 'removeFile', playlistId: 'focus-mix', fileId: 'rain' }],
    ['moving a file in a playlist', { type: 'moveFile', playlistId: 'focus-mix', from: 2, to: 0 }],
    ['removing a playlist', { type: 'removePlaylist', playlistId: 'focus-mix' }],
    ['choosing a playlist for a timer', { type: 'chooseBackgroundSound', owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'focus-mix', volume: 0.3 } }],
    ['choosing no playlist for a focus session', { type: 'chooseBackgroundSound', owner: { of: 'focus session', id: 'morning' }, sound: { playlistId: null, volume: 0.8 } }]
  ])('%s is a music command', (_, message) => {
    expect(isMusicCommand(message)).toBe(true)
  })

  test.each([
    ['nothing', undefined],
    ['a timer command', { type: 'remove', timerId: 'tea' }],
    ['a focus session command', { type: 'start', sessionId: 'morning' }],
    ['an alarm command', { type: 'switchOn', alarmId: 'wake-up' }],
    ['an unknown type', { type: 'shuffle', playlistId: 'focus-mix' }],
    ['a removal without a playlist id', { type: 'removePlaylist' }],
    ['an add without a playlist', { type: 'addPlaylist' }],
    ['an add of a playlist without a name', { type: 'addPlaylist', playlist: { id: 'focus-mix' } }],
    ['a rename without a name', { type: 'renamePlaylist', playlistId: 'focus-mix' }],
    ['adding files that are not a list', { type: 'addFiles', playlistId: 'focus-mix', files: rain }],
    ['adding a file without an id', { type: 'addFiles', playlistId: 'focus-mix', files: [{ name: 'rain.mp3' }] }],
    ['adding a file whose length is text', { type: 'addFiles', playlistId: 'focus-mix', files: [{ ...rain, length: '3:00' }] }],
    ['removing a file without its id', { type: 'removeFile', playlistId: 'focus-mix' }],
    ['a move without where to', { type: 'moveFile', playlistId: 'focus-mix', from: 2 }],
    ['a choice without an owner', { type: 'chooseBackgroundSound', sound: { playlistId: null, volume: 0.5 } }],
    ['a choice for an alarm', { type: 'chooseBackgroundSound', owner: { of: 'alarm', id: 'wake-up' }, sound: { playlistId: null, volume: 0.5 } }],
    ['a choice without a volume', { type: 'chooseBackgroundSound', owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 'focus-mix' } }],
    ['a choice whose playlist id is a number', { type: 'chooseBackgroundSound', owner: { of: 'timer', id: 'pasta' }, sound: { playlistId: 7, volume: 0.5 } }]
  ])('%s is not a music command', (_, message) => {
    expect(isMusicCommand(message)).toBe(false)
  })
})

describe('a sound command', () => {
  test.each(['pauseSound', 'resumeSound', 'nextFile', 'previousFile'])('%s is told apart from any other message', (type) => {
    expect(isSoundCommand({ type })).toBe(true)
    expect(isMusicCommand({ type })).toBe(false)
  })

  test.each([
    ['a timer command', { type: 'pause', timerId: 'tea' }],
    ['a music command', { type: 'removePlaylist', playlistId: 'focus-mix' }],
    ['no record', 'pauseSound'],
    ['nothing', null]
  ])('%s is not one', (_what, message) => {
    expect(isSoundCommand(message)).toBe(false)
  })
})
