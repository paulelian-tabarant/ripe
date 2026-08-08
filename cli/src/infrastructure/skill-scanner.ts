import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { GitRepository } from './git-repository.js'

export const MAIN_BRANCH = 'main'
const SKILLS_DIR = '.claude/skills'
const SKILL_FILE_PATTERN = /^\.claude\/skills\/([^/]+)\/SKILL\.md$/

export type SkillSkipReason = 'namespaced' | 'malformed-frontmatter' | 'not-on-main'

export interface SkillScanResult {
  names: string[]
  skipped: { path: string; reason: SkillSkipReason }[]
}

interface SkillFile {
  path: string
  content: string
}

export async function scanSkillCatalogOnMain(
  gitRepository: GitRepository,
  projectDirectoryPath: string,
): Promise<SkillScanResult> {
  const filePaths = await gitRepository.listFilesAtRef(MAIN_BRANCH, SKILLS_DIR)
  const mainSkillFilePaths = filePaths.filter((path) => SKILL_FILE_PATTERN.test(path))

  const files = await Promise.all(
    mainSkillFilePaths.map(
      async (path): Promise<SkillFile> => ({
        path,
        content: await gitRepository.readFileAtRef(MAIN_BRANCH, path),
      }),
    ),
  )

  const { names, skipped } = classifySkillFiles(files)
  const notOnMain = findSkillDirsNotOnMain(projectDirectoryPath, mainSkillFilePaths)

  return { names, skipped: [...skipped, ...notOnMain] }
}

function classifySkillFiles(files: SkillFile[]): SkillScanResult {
  const names: string[] = []
  const skipped: SkillScanResult['skipped'] = []

  for (const file of files) {
    const name = extractSkillName(file.content)

    if (name === undefined) {
      skipped.push({ path: file.path, reason: 'malformed-frontmatter' })
      continue
    }

    if (name.includes(':')) {
      skipped.push({ path: file.path, reason: 'namespaced' })
      continue
    }

    names.push(name)
  }

  return { names, skipped }
}

function extractSkillName(content: string): string | undefined {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) return undefined

  const nameMatch = frontmatterMatch[1]?.match(/^name:\s*["']?([^"'\n]+?)["']?\s*$/m)

  return nameMatch?.[1]
}

function findSkillDirsNotOnMain(
  projectDirectoryPath: string,
  mainSkillFilePaths: string[],
): SkillScanResult['skipped'] {
  const skillsDirPath = join(projectDirectoryPath, SKILLS_DIR)
  if (!existsSync(skillsDirPath)) return []

  const mainSkillDirNames = new Set(
    mainSkillFilePaths
      .map((path) => path.match(SKILL_FILE_PATTERN)?.[1])
      .filter((name): name is string => name !== undefined),
  )

  return readdirSync(skillsDirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => existsSync(join(skillsDirPath, entry.name, 'SKILL.md')))
    .filter((entry) => !mainSkillDirNames.has(entry.name))
    .map((entry) => ({
      path: `${SKILLS_DIR}/${entry.name}/SKILL.md`,
      reason: 'not-on-main' as const,
    }))
}
