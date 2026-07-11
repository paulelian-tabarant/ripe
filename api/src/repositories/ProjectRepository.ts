import type Database from 'better-sqlite3';

export type Project = {
  id: string;
  name: string;
};

export class ProjectRepository {
  private readonly findByNameStatement;
  private readonly insertStatement;

  constructor(private readonly db: Database.Database) {
    this.findByNameStatement = this.db.prepare<[string], Project>(
      'SELECT id, name FROM projects WHERE name = ?'
    );
    this.insertStatement = this.db.prepare('INSERT INTO projects (id, name) VALUES (?, ?)');
  }

  findByName(name: string): Project | undefined {
    return this.findByNameStatement.get(name);
  }

  insert(project: Project): void {
    this.insertStatement.run(project.id, project.name);
  }
}
