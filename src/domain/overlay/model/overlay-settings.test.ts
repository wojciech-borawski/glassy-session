import { nearestCorner, nudged, placedIn, positionOf, visibleAreaOf } from './overlay-settings'

const viewport = { width: 1200, height: 800 }

describe('where the overlay stays when it is dropped in move mode', () => {
  test('dropped in the top left quarter, it keeps its distance from the top and left edges', () => {
    expect(positionOf({ left: 140, top: 90, width: 260, height: 200 }, viewport)).toEqual({ corner: 'top left', offset: { x: 140, y: 90 } })
  })

  test('dropped in the bottom right quarter, it keeps its distance from the bottom and right edges', () => {
    expect(positionOf({ left: 900, top: 500, width: 260, height: 200 }, viewport)).toEqual({ corner: 'bottom right', offset: { x: 40, y: 100 } })
  })

  test.each([
    [{ left: -50, top: -30, width: 260, height: 200 }, { corner: 'top left', offset: { x: 0, y: 0 } }],
    [{ left: 1100, top: 700, width: 260, height: 200 }, { corner: 'bottom right', offset: { x: 0, y: 0 } }],
    [{ left: 300, top: -500, width: 260, height: 200 }, { corner: 'top left', offset: { x: 300, y: 0 } }]
  ] as const)('dropped partly off the page at %o, it stays whole inside the page at %o', (box, position) => {
    expect(positionOf(box, viewport)).toEqual(position)
  })
})

describe('where the overlay shows when the window has shrunk since it was dropped', () => {
  test('it keeps its corner and comes in just as far as the whole overlay fits inside the page', () => {
    expect(placedIn({ corner: 'top left', offset: { x: 300, y: 250 } }, { width: 260, height: 200 }, { width: 500, height: 400 }))
      .toEqual({ corner: 'top left', offset: { x: 240, y: 200 } })
  })

  test('it stays where it was dropped while it fits', () => {
    expect(placedIn({ corner: 'bottom right', offset: { x: 40, y: 100 } }, { width: 260, height: 200 }, viewport))
      .toEqual({ corner: 'bottom right', offset: { x: 40, y: 100 } })
  })

  test('in a page smaller than the overlay, it sits against its corner', () => {
    expect(placedIn({ corner: 'bottom left', offset: { x: 30, y: 30 } }, { width: 260, height: 200 }, { width: 200, height: 150 }))
      .toEqual({ corner: 'bottom left', offset: { x: 0, y: 0 } })
  })
})

describe('nudging the overlay by keyboard in move mode', () => {
  const size = { width: 260, height: 200 }

  test.each([
    [{ corner: 'top left', offset: { x: 140, y: 90 } }, { x: 8, y: 0 }, { corner: 'top left', offset: { x: 148, y: 90 } }],
    [{ corner: 'bottom right', offset: { x: 40, y: 100 } }, { x: 8, y: -32 }, { corner: 'bottom right', offset: { x: 32, y: 132 } }],
    [{ corner: 'top left', offset: { x: 460, y: 90 } }, { x: 32, y: 0 }, { corner: 'top right', offset: { x: 448, y: 90 } }],
    [{ corner: 'bottom right', offset: { x: 4, y: 100 } }, { x: 8, y: 0 }, { corner: 'bottom right', offset: { x: 0, y: 100 } }]
  ] as const)('from %o, moved by %o, it stays at %o', (from, by, to) => {
    expect(nudged(from, by, size, viewport)).toEqual(to)
  })
})

describe('which corner of the page a point is nearest to', () => {
  test.each([
    [{ x: 100, y: 100 }, 'top left'],
    [{ x: 1100, y: 100 }, 'top right'],
    [{ x: 100, y: 700 }, 'bottom left'],
    [{ x: 1100, y: 700 }, 'bottom right'],
    [{ x: 600, y: 400 }, 'bottom right']
  ] as const)('%o is nearest to the %s corner', (point, corner) => {
    expect(nearestCorner(point, viewport)).toBe(corner)
  })
})

describe('the part of the page the overlay stays inside', () => {
  test('leaves out the scrollbars of the page, so the overlay never sits under one', () => {
    expect(visibleAreaOf({ innerWidth: 1200, innerHeight: 800 }, { clientWidth: 1185, clientHeight: 785 })).toEqual({ width: 1185, height: 785 })
  })

  test('is the whole window while the page reports no size of its own, as before it is laid out', () => {
    expect(visibleAreaOf({ innerWidth: 1200, innerHeight: 800 }, { clientWidth: 0, clientHeight: 0 })).toEqual({ width: 1200, height: 800 })
  })

  test('is no taller than the window when the page gives the height of the whole document, as in quirks mode', () => {
    expect(visibleAreaOf({ innerWidth: 1200, innerHeight: 800 }, { clientWidth: 1185, clientHeight: 3400 })).toEqual({ width: 1185, height: 800 })
  })
})
