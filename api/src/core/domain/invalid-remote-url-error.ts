export class InvalidRemoteUrlError extends Error {
  constructor(remoteUrl: string) {
    super(`Could not derive a repoKey from remoteUrl: ${remoteUrl}`)
    this.name = 'InvalidRemoteUrlError'
  }
}
