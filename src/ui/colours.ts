/** The colours the kit can draw a timer in. Domain code keeps a colour by its name, and only the kit knows how it looks. */
export const colourNames = ['blue', 'orange', 'green', 'gold', 'violet', 'pink', 'teal'] as const

export type ColourName = typeof colourNames[number]

export const colourValues: Readonly<Record<ColourName, string>> = {
  blue: '#2f7dd1',
  orange: '#c2571a',
  green: '#2e9e5b',
  gold: '#b8860b',
  violet: '#7a4fd1',
  pink: '#d1437a',
  teal: '#1f9aa3'
}
