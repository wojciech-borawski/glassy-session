type Edge = 'top' | 'bottom'

type Side = 'left' | 'right'

export type Corner = `${Edge} ${Side}`

function partsOf(corner: Corner): [Edge, Side] {
  return corner.split(' ') as [Edge, Side]
}

/** The corner of the viewport whose quarter holds the point. The middle counts as the bottom right. */
export function nearestCorner(point: Readonly<{ x: number, y: number }>, viewport: Readonly<{ width: number, height: number }>): Corner {
  const side = point.x < viewport.width / 2 ? 'left' : 'right'
  const edge = point.y < viewport.height / 2 ? 'top' : 'bottom'
  return `${edge} ${side}`
}

/** The corner an arrow key moves the overlay to: the neighbouring one that way, or the same one at the edge. */
export function cornerToward(corner: Corner, direction: 'up' | 'down' | 'left' | 'right'): Corner {
  const [edge, side] = partsOf(corner)
  switch (direction) {
  case 'up':
    return `top ${side}`
  case 'down':
    return `bottom ${side}`
  case 'left':
    return `${edge} left`
  case 'right':
    return `${edge} right`
  }
}


/** How the overlay shows on every page. */
export type OverlaySettings = Readonly<{
  /** Whether the overlay shows on web pages at all. */
  shownOnPages: boolean
  corner: Corner
  collapsed: boolean
}>

export const defaultOverlaySettings: OverlaySettings = { shownOnPages: true, corner: 'bottom right', collapsed: false }
