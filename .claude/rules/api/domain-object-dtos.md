# Domain objects cross their boundary through intent-named DTOs

A domain object never exposes its private state or accepts raw fields from outside directly. Each
direction gets its own plain-data type, named after its intent, and a matching method:

- `XCreationDto` → `X.create(dto)`: a brand-new object, with server-assigned ids generated inside.
- `XPersistenceDto` → `X.fromPersistence(dto)` / `x.toPersistence()`: the full stored shape, used
  to rebuild an already-valid object and to write it back. Flat, child collections included.
- `x.toExposition()` → `XExpositionDto`: what the rest of the system (use-cases) may read.
  Derived from the persistence DTO with `Omit`, never declared from scratch.

```ts
export class Skill {
  private constructor(
    readonly id: string,
    readonly projectId: string,
    readonly name: string,
  ) {}

  static create(dto: SkillCreationDto): Skill {
    return new Skill(`skill_${nanoid()}`, dto.projectId, dto.name)
  }

  static fromPersistence(dto: SkillPersistenceDto): Skill {
    return new Skill(dto.id, dto.projectId, dto.name)
  }

  toPersistence(): SkillPersistenceDto {
    return { id: this.id, projectId: this.projectId, name: this.name }
  }

  toExposition(): SkillExpositionDto {
    return { id: this.id, name: this.name }
  }
}

export type SkillPersistenceDto = { id: string; projectId: string; name: string }
export type SkillCreationDto = Omit<SkillPersistenceDto, 'id'>
export type SkillExpositionDto = Omit<SkillPersistenceDto, 'projectId'>
```

An aggregate maps its children through theirs, so only the aggregate knows how its parts are
built and shown:

```ts
// Project.fromPersistence — children rebuilt through their own factory
dto.skills.map((skill) => Skill.fromPersistence(skill))

// Project.toExposition — children exposed through their own method
skills: this.skills.map((skill) => skill.toExposition())
```

**Why**: the outside world only transfers data in and out, so a change to an object's internals or
to how it's built can't leak past these three shapes. Persistence and exposition are separate
types because they differ (here `projectId` is stored on a skill but redundant once it's nested in
its project), and one name per intent keeps them from drifting into each other.

**How to apply**:

- Use `type` aliases for DTOs, not `interface`. Declare the fields once, on the persistence DTO,
  and derive the others from it (`Omit`, or a plain alias when the shapes are identical) — keep
  each intent's name, don't duplicate fields.
- `fromPersistence` can't fail — the data was validated once, at the `create` that first
  persisted it. Anything that can fail on raw input (parsing, normalizing) happens before the
  object exists, in a value object's `resolve`-style factory returning a result object (see
  `result-objects-over-throw.md`), so `create` stays infallible.
- When `create` receives an already-validated value object rather than plain data, it stays
  positional (`Project.create(name, gitRemote)`) — a creation DTO is for plain data only.
- A repository reads and writes through `fromPersistence` and `toPersistence()`; a use-case reads
  through `toExposition()`. A use-case may reuse a domain creation DTO as its own input type,
  never the reverse.
- Domain code doesn't import the wire types in `endpoints/contracts/` — those are a separate
  shape for HTTP.
