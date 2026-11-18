import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { setProjectAnnotations } from '@storybook/vue3-vite'
import * as projectAnnotations from '../.storybook/preview'

setProjectAnnotations(projectAnnotations)
