export interface RegisterProjectRequestBody {
  name: string
}

export interface RegisterProjectResponseBody {
  projectId: string
}

export interface ProjectConflictResponseBody {
  projectId: string
  message: string
}

export interface ProjectResponseBodyItem {
  id: string
  name: string
}
