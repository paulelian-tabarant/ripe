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

export interface Project {
  id: string
  name: string
}

export type ListProjectsResponseBody = Project[]
