export interface RegisterProjectRequestBody {
  name: string
  remoteUrl: string
}

export interface RegisterProjectResponseBody {
  projectId: string
}

export interface ProjectResponseBodyItem {
  id: string
  name: string
}
