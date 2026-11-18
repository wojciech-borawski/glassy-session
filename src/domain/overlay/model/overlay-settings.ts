type Edge = 'top' | 'bottom'

type Side = 'left' | 'right'

export type Corner = `${Edge} ${Side}`

/** The two page edges that meet at the corner, top or bottom first. */
export function edgesOf(corner: Corner): [Edge, Side] {
  return corner.split(' ') as [Edge, Side]
}

/** The corner of the viewport whose quarter holds the point. The middle counts as the bottom right. */
export function nearestCorner(point: Readonly<{ x: number, y: number }>, viewport: Readonly<{ width: number, height: number }>): Corner {
  const side = point.x < viewport.width / 2 ? 'left' : 'right'
  const edge = point.y < viewport.height / 2 ? 'top' : 'bottom'
  return `${edge} ${side}`
}

type Size = Readonly<{ width: number, height: number }>

/** Where the overlay sits on the page, its top left point and its size, in CSS pixels. */
export type Box = Readonly<{ left: number, top: number, width: number, height: number }>

/** How far the overlay sits from the two page edges of its corner, in CSS pixels. */
export type Offset = Readonly<{ x: number, y: number }>

/** Where the overlay stays: the corner of the page nearest to it, and its distance from that corner's two edges. */
export type OverlayPosition = Readonly<{ corner: Corner, offset: Offset }>

/** One side of the visible area: the root's own size, unless it is missing or larger than the window. */
function visibleSide(inWindow: number, ofRoot: number): number {
  return ofRoot > 0 ? Math.min(ofRoot, inWindow) : inWindow
}

/**
 * The part of the page the overlay stays inside: the window without the page's scrollbars, which the page's root element leaves out
 * of its own size. A root with no size yet, or one as tall as its whole document in quirks mode, gives the window's size instead.
 */
export function visibleAreaOf(window: Readonly<{ innerWidth: number, innerHeight: number }>, root: Readonly<{ clientWidth: number, clientHeight: number }>): Size {
  return { width: visibleSide(window.innerWidth, root.clientWidth), height: visibleSide(window.innerHeight, root.clientHeight) }
}

/** The value moved into 0 to the largest, or 0 when the largest is below it. */
function within(value: number, largest: number): number {
  return Math.max(0, Math.min(value, largest))
}

/** The position of the overlay dropped in the box, moved inside the page as far as it reaches out. */
export function positionOf(box: Box, viewport: Size): OverlayPosition {
  const left = within(box.left, viewport.width - box.width)
  const top = within(box.top, viewport.height - box.height)
  const corner = nearestCorner({ x: left + box.width / 2, y: top + box.height / 2 }, viewport)
  const [edge, side] = edgesOf(corner)
  return {
    corner,
    offset: {
      x: side === 'left' ? left : viewport.width - left - box.width,
      y: edge === 'top' ? top : viewport.height - top - box.height
    }
  }
}

/** The position the overlay of that size shows at in the page: its own corner, with each distance cut down as far as the whole overlay needs to fit. */
export function placedIn(position: OverlayPosition, size: Size, viewport: Size): OverlayPosition {
  return {
    corner: position.corner,
    offset: { x: within(position.offset.x, viewport.width - size.width), y: within(position.offset.y, viewport.height - size.height) }
  }
}

/** The box the overlay of that size takes in the page at the position. */
function boxAt(position: OverlayPosition, size: Size, viewport: Size): Box {
  const [edge, side] = edgesOf(position.corner)
  const { offset } = placedIn(position, size, viewport)
  return {
    left: side === 'left' ? offset.x : viewport.width - offset.x - size.width,
    top: edge === 'top' ? offset.y : viewport.height - offset.y - size.height,
    ...size
  }
}

/** The position of the overlay of that size moved across the page by the distance given, rightward and downward. */
export function nudged(position: OverlayPosition, by: Readonly<{ x: number, y: number }>, size: Size, viewport: Size): OverlayPosition {
  const box = boxAt(position, size, viewport)
  return positionOf({ ...box, left: box.left + by.x, top: box.top + by.y }, viewport)
}

/** How the overlay shows on every page. */
export type OverlaySettings = Readonly<{
  /** Whether the overlay shows on web pages at all. */
  shownOnPages: boolean
  /** The corner the overlay and its pill stay nearest to. */
  corner: Corner
  /** How far from the two edges of its corner the overlay stays. */
  offset: Offset
  collapsed: boolean
}>

/** How far from the edges of its corner the overlay stays until the person moves it, and where settings saved before it could stay anywhere put it. */
export const CORNER_GAP: Offset = { x: 12, y: 12 }

export const defaultOverlaySettings: OverlaySettings = { shownOnPages: true, corner: 'bottom right', offset: CORNER_GAP, collapsed: false }
