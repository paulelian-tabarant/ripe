import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function getRemoteUrl(cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd })

  return stdout.trim()
}
