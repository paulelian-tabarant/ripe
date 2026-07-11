import type Database from 'better-sqlite3'

export type Project = {
  id: string
  name: string
}

export class ProjectRepository {
  private readonly findByNameStatement
  private readonly findAllStatement
  private readonly insertStatement

  constructor(private readonly db: Database.Database) {
    this.findByNameStatement = this.db.prepare<[string], Project>(
      'SELECT id, name FROM projects WHERE name = ?',
    )
    this.findAllStatement = this.db.prepare<[], Project>('SELECT id, name FROM projects')
    this.insertStatement = this.db.prepare('INSERT INTO projects (id, name) VALUES (?, ?)')
  }

  findByName(name: string): Project | undefined {
    return this.findByNameStatement.get(name)
  }

  findAll(): Project[] {
    return this.findAllStatement.all()
  }

  insert(project: Project): void {
    this.insertStatement.run(project.id, project.name)
  }
}
