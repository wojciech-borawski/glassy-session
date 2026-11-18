export function clampFraction(fraction: number): number {
  return Math.min(Math.max(fraction, 0), 1)
}

export function percentOf(fraction: number): number {
  return Math.round(clampFraction(fraction) * 100)
}
