import type Database from 'better-sqlite3'

export type Project = {
  id: string
  name: string
  repoKey: string
}

export type ProjectListItem = {
  id: string
  name: string
}

type ProjectRow = {
  id: string
  name: string
  repo_key: string
}

export class ProjectRepository {
  private readonly findByRepoKeyStatement
  private readonly findAllStatement
  private readonly insertStatement

  constructor(private readonly db: Database.Database) {
    this.findByRepoKeyStatement = this.db.prepare<[string], ProjectRow>(
      'SELECT id, name, repo_key FROM projects WHERE repo_key = ?',
    )
    this.findAllStatement = this.db.prepare<[], ProjectListItem>('SELECT id, name FROM projects')
    this.insertStatement = this.db.prepare(
      'INSERT INTO projects (id, name, repo_key) VALUES (?, ?, ?)',
    )
  }

  getByRepoKey(repoKey: string): Project | undefined {
    const row = this.findByRepoKeyStatement.get(repoKey)

    return row && { id: row.id, name: row.name, repoKey: row.repo_key }
  }

  list(): ProjectListItem[] {
    return this.findAllStatement.all()
  }

  addNewProject(project: Project): void {
    this.insertStatement.run(project.id, project.name, project.repoKey)
  }
}
