export const themeNames = ['frost', 'lagoon', 'pebble'] as const

export type ThemeName = typeof themeNames[number]

export type ThemeVersion = 'light' | 'dark'

export type ThemeVersionChoice = ThemeVersion | 'system'
