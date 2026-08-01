import GitUrlParse from 'git-url-parse'

export function normalizeRepoKey(remoteUrl: string): string | undefined {
  try {
    const parsed = GitUrlParse(remoteUrl)

    if (!parsed.source || !parsed.owner || !parsed.name) {
      return undefined
    }

    return `${parsed.source}/${parsed.owner}/${parsed.name}`
  } catch {
    return undefined
  }
}
