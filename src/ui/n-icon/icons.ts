export const icons = {
  sun: 'M12 7a5 5 0 100 10 5 5 0 000-10zM12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
  stopwatch: 'M12 22a8 8 0 100-16 8 8 0 000 16zM12 10v4l2.5 2M9 2h6',
  target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8z',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8zM10 20a2 2 0 004 0',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  sliders: 'M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4M16 4v4M8 10v4M14 16v4',
  play: 'M7 4l13 8-13 8z',
  pause: 'M7 4v16M17 4v16',
  'rotate-left': 'M4 12a8 8 0 108-8H7M7 4l3-3M7 4l3 3',
  'skip-forward': 'M5 4l10 8-10 8zM19 4v16',
  'skip-back': 'M19 4L9 12l10 8zM5 4v16',
  pin: 'M9 3h6l-1 6 4 4H6l4-4zM12 13v8',
  volume: 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 010 6',
  'volume-off': 'M4 9v6h4l5 4V5L8 9zM16 9l5 6M21 9l-5 6',
  plus: 'M12 5v14M5 12h14',
  'arrow-up': 'M12 19V5M5 12l7-7 7 7',
  close: 'M6 6l12 12M18 6L6 18',
  'chevron-left': 'M15 5l-7 7 7 7',
  'chevron-right': 'M9 5l7 7-7 7',
  'chevron-down': 'M5 9l7 7 7-7',
  'chevron-up': 'M5 15l7-7 7 7',
  'music-note': 'M9 18V5l11-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM20 16a3 3 0 11-6 0 3 3 0 016 0z',
  check: 'M5 12l5 5L20 7',
  pencil: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4'
} as const

export type IconName = keyof typeof icons
