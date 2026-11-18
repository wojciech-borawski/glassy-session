/** Runs each command after the ones given to it before have settled, so their loads and saves never interleave. A command that fails does not hold up the ones after it. */
export type CommandQueue = <Result>(command: () => Promise<Result>) => Promise<Result>

export function createCommandQueue(): CommandQueue {
  let lastCommand: Promise<unknown> = Promise.resolve()
  return (command) => {
    const result = lastCommand.then(command)
    lastCommand = result.catch(() => {})
    return result
  }
}
