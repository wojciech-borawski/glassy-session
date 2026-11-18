import { cornerToward, nearestCorner } from './overlay-settings'

const viewport = { width: 1200, height: 800 }

describe('where the overlay goes when it is dropped', () => {
  test.each([
    [{ x: 100, y: 100 }, 'top left'],
    [{ x: 1100, y: 100 }, 'top right'],
    [{ x: 100, y: 700 }, 'bottom left'],
    [{ x: 1100, y: 700 }, 'bottom right'],
    [{ x: 600, y: 400 }, 'bottom right']
  ] as const)('dropped at %o it goes to the %s corner', (point, corner) => {
    expect(nearestCorner(point, viewport)).toBe(corner)
  })
})

describe('moving the overlay by keyboard', () => {
  test.each([
    ['top left', 'right', 'top right'],
    ['top right', 'down', 'bottom right'],
    ['bottom right', 'left', 'bottom left'],
    ['bottom left', 'up', 'top left'],
    ['top left', 'up', 'top left'],
    ['bottom right', 'right', 'bottom right']
  ] as const)('from the %s corner, %s goes to the %s corner', (from, direction, to) => {
    expect(cornerToward(from, direction)).toBe(to)
  })
})
