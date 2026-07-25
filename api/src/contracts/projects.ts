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

export type ListProjectsResponseBody = { id: string; name: string }[]
