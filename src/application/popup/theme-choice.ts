import type { InjectionKey, Ref } from 'vue'
import type { ThemeName, ThemeVersionChoice } from '@/ui/n-theme/themes'

export type ThemeChoice = {
  theme: Readonly<Ref<ThemeName>>
  version: Readonly<Ref<ThemeVersionChoice>>
  chooseTheme: (theme: ThemeName) => void
  chooseVersion: (version: ThemeVersionChoice) => void
}

const themeChoiceKey: InjectionKey<ThemeChoice> = Symbol('theme choice')

export function provideThemeChoice(): ThemeChoice {
  const theme = ref<ThemeName>('frost')
  const version = ref<ThemeVersionChoice>('system')
  const choice: ThemeChoice = {
    theme: readonly(theme),
    version: readonly(version),
    chooseTheme: chosen => { theme.value = chosen },
    chooseVersion: chosen => { version.value = chosen }
  }
  provide(themeChoiceKey, choice)
  return choice
}

export function useThemeChoice(): ThemeChoice {
  const choice = inject(themeChoiceKey)
  if (!choice) throw new Error('useThemeChoice needs provideThemeChoice in an ancestor component')
  return choice
}
