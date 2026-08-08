import type Database from 'better-sqlite3'
import { Project } from '../core/domain/project.js'

export type ProjectReadModel = {
  id: string
  name: string
}

type ProjectRow = {
  id: string
  name: string
  repo_key: string
  remote_url: string
}

export class ProjectRepository {
  private readonly findByRepoKeyStatement
  private readonly findAllStatement
  private readonly insertStatement

  constructor(private readonly db: Database.Database) {
    this.findByRepoKeyStatement = this.db.prepare<[string], ProjectRow>(
      'SELECT id, name, repo_key, remote_url FROM projects WHERE repo_key = ?',
    )
    this.findAllStatement = this.db.prepare<[], ProjectReadModel>('SELECT id, name FROM projects')
    this.insertStatement = this.db.prepare(
      'INSERT INTO projects (id, name, repo_key, remote_url) VALUES (?, ?, ?, ?)',
    )
  }

  getByRepoKey(repoKey: string): Project | undefined {
    const row = this.findByRepoKeyStatement.get(repoKey)

    return (
      row &&
      Project.reconstitute({
        id: row.id,
        name: row.name,
        repoKey: row.repo_key,
        remoteUrl: row.remote_url,
      })
    )
  }

  list(): ProjectReadModel[] {
    return this.findAllStatement.all()
  }

  addNewProject(project: Project): void {
    this.insertStatement.run(
      project.id,
      project.name,
      project.gitRepository.repoKey,
      project.gitRepository.remoteUrl,
    )
  }
}
