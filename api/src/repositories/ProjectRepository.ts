import type Database from 'better-sqlite3';

export type Project = {
  id: string;
  name: string;
};

export class ProjectRepository {
  constructor(private readonly db: Database.Database) {}

  findByName(name: string): Project | undefined {
    return this.db
      .prepare<[string], Project>('SELECT id, name FROM projects WHERE name = ?')
      .get(name);
  }

  insert(project: Project): void {
    this.db
      .prepare('INSERT INTO projects (id, name) VALUES (?, ?)')
      .run(project.id, project.name);
  }
}
