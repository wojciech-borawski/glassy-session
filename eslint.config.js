import { defineConfig, globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import storybook from 'eslint-plugin-storybook'
import wxtAutoImports from './.wxt/eslint-auto-imports.mjs'

/**
 * Imports from the given src folders, written with an alias or a relative path.
 * The direction is described under "Where code goes" in AGENTS.md.
 */
function importsFrom(folders) {
  return {
    regex: `^(?:[@~]/|[@~]{2}/src/|(?:\\.\\./)+(?:src/)?)(?:${folders.join('|')})(?:/|$)`,
    message: 'Imports point one way, see "Where code goes" in AGENTS.md.'
  }
}

/** The raw stored timers and focus sessions. Views take them settled from useStoredAsOfNow(), as "Where code goes" in AGENTS.md says. */
const rawTimersAndSessions = [['stored-timers', 'useStoredTimers'], ['stored-sessions', 'useStoredSessions']].map(([module, name]) => ({
  regex: `(?:^|/)${module}$`,
  importNames: [name],
  message: 'Views take timers and focus sessions from useStoredAsOfNow(), see "Where code goes" in AGENTS.md.'
}))

/**
 * The domain areas each area may import, as "Where code goes" in AGENTS.md says: the timer area never imports the session area, for one.
 * `command` is not an area, and stories and tests may place the components of several areas together.
 */
const AREA_IMPORTS = {
  timer: ['sound', 'tracking'],
  session: ['timer', 'tracking'],
  tracking: ['timer'],
  alarm: ['sound'],
  overlay: [],
  sound: [],
  music: ['sound']
}

/** Imports from the other areas the area may not import. */
function otherAreas(area) {
  const forbidden = Object.keys(AREA_IMPORTS).filter((other) => other !== area && !AREA_IMPORTS[area].includes(other))
  return {
    regex: `^(?:[@~]/domain/|(?:\\.\\./)+)(?:${forbidden.join('|')})(?:/|$)`,
    message: `The ${area} area imports only the areas "Where code goes" in AGENTS.md allows.`
  }
}

/** Forbids the imports the patterns describe. A later block replaces the whole list, so each block names every pattern that applies to its files. */
function forbidImports(...patterns) {
  return { 'no-restricted-imports': ['error', { patterns }] }
}

export default defineConfig([
  globalIgnores(['node_modules', '.output', '.wxt', 'storybook-static']),
  js.configs.recommended,
  tseslint.configs.recommended,
  vue.configs['flat/essential'],
  storybook.configs['flat/recommended'],
  wxtAutoImports,
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser
      }
    }
  },
  {
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      'no-undef': 'off'
    }
  },
  {
    rules: {
      indent: ['error', 2],
      'comma-dangle': ['error', 'never'],
      'linebreak-style': ['error', 'windows'],
      quotes: ['error', 'single'],
      semi: ['error', 'never'],
      'vue/multi-word-component-names': 'off'
    }
  },
  {
    files: ['src/ui/**'],
    ignores: ['**/*.test.ts'],
    rules: forbidImports(importsFrom(['domain', 'infrastructure', 'application']))
  },
  {
    files: ['src/utils/**'],
    ignores: ['**/*.test.ts'],
    rules: forbidImports(importsFrom(['ui', 'domain', 'infrastructure', 'application']))
  },
  {
    files: ['src/domain/**'],
    ignores: ['**/*.test.ts'],
    rules: forbidImports(importsFrom(['infrastructure', 'application']))
  },
  {
    files: ['src/domain/**/*.vue'],
    rules: forbidImports(importsFrom(['infrastructure', 'application']), ...rawTimersAndSessions)
  },
  ...Object.keys(AREA_IMPORTS).flatMap((area) => [
    {
      files: [`src/domain/${area}/**/*.ts`],
      ignores: ['**/*.test.ts', '**/*.stories.ts'],
      rules: forbidImports(importsFrom(['infrastructure', 'application']), otherAreas(area))
    },
    {
      files: [`src/domain/${area}/**/*.vue`],
      rules: forbidImports(importsFrom(['infrastructure', 'application']), otherAreas(area), ...rawTimersAndSessions)
    }
  ]),
  {
    files: ['src/application/**/*.vue'],
    rules: forbidImports(...rawTimersAndSessions)
  },
  {
    files: ['src/infrastructure/**'],
    ignores: ['**/*.test.ts'],
    rules: forbidImports(importsFrom(['application']))
  }
])
