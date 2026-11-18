import { runEngines } from './run-engines'

export default defineBackground({
  type: 'module',
  main() {
    void runEngines()
  }
})
