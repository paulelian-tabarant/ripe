import type Database from 'better-sqlite3'
import { Project } from '../core/domain/project.js'
import { Skill } from '../core/domain/skill.js'

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

type SkillRow = {
  id: string
  project_id: string
  name: string
}

export class ProjectRepository {
  private readonly findByRepoKeyStatement
  private readonly findByIdStatement
  private readonly findSkillsByProjectIdStatement
  private readonly findAllStatement
  private readonly insertStatement
  private readonly upsertProjectStatement
  private readonly upsertSkillStatement

  constructor(private readonly db: Database.Database) {
    this.findByRepoKeyStatement = this.db.prepare<[string], ProjectRow>(
      'SELECT id, name, repo_key, remote_url FROM projects WHERE repo_key = ?',
    )
    this.findByIdStatement = this.db.prepare<[string], ProjectRow>(
      'SELECT id, name, repo_key, remote_url FROM projects WHERE id = ?',
    )
    this.findSkillsByProjectIdStatement = this.db.prepare<[string], SkillRow>(
      'SELECT id, project_id, name FROM skills WHERE project_id = ?',
    )
    this.findAllStatement = this.db.prepare<[], ProjectReadModel>('SELECT id, name FROM projects')
    this.insertStatement = this.db.prepare(
      'INSERT INTO projects (id, name, repo_key, remote_url) VALUES (?, ?, ?, ?)',
    )
    this.upsertProjectStatement = this.db.prepare(
      'INSERT INTO projects (id, name, repo_key, remote_url) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
    )
    this.upsertSkillStatement = this.db.prepare(
      'INSERT INTO skills (id, project_id, name) VALUES (?, ?, ?) ON CONFLICT(project_id, name) DO NOTHING',
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

  findById(id: string): Project | undefined {
    const row = this.findByIdStatement.get(id)

    if (!row) {
      return undefined
    }

    const skillRows = this.findSkillsByProjectIdStatement.all(id)

    return Project.reconstitute({
      id: row.id,
      name: row.name,
      repoKey: row.repo_key,
      remoteUrl: row.remote_url,
      skills: skillRows.map((skillRow) =>
        Skill.reconstitute({
          id: skillRow.id,
          projectId: skillRow.project_id,
          name: skillRow.name,
        }),
      ),
    })
  }

  list(): ProjectReadModel[] {
    return this.findAllStatement.all()
  }

  addNewProject(project: Project): void {
    const snapshot = project.snapshot()

    this.insertStatement.run(snapshot.id, snapshot.name, snapshot.repoKey, snapshot.remoteUrl)
  }

  save(project: Project): void {
    const snapshot = project.snapshot()

    this.db.transaction(() => {
      this.upsertProjectStatement.run(
        snapshot.id,
        snapshot.name,
        snapshot.repoKey,
        snapshot.remoteUrl,
      )

      for (const skill of snapshot.skills) {
        this.upsertSkillStatement.run(skill.id, snapshot.id, skill.name)
      }
    })()
  }
}
