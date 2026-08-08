import type { InitPrompter } from './init.js'

export function buildInitPrompter(askFn: (question: string) => Promise<string>): InitPrompter {
  return {
    promptForServerUrl: (): Promise<string> => askFn('Server URL: '),
    promptAnotherServerUrl: (): Promise<string> => askFn('Please enter another server URL: '),
    promptToConfirmServerUrl: (existingUrl: string): Promise<boolean> =>
      askFn(`Found existing server URL: "${existingUrl}". Keep it? (y/n) `).then(
        (answer) => answer.toLowerCase() === 'y',
      ),
    promptForHttpsRemote: (remoteUrl: string): Promise<string> =>
      askFn(`Your git remote ("${remoteUrl}") isn't HTTPS. Enter the HTTPS URL for this repo: `),
  }
}
