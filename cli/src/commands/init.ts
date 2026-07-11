import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { type ProjectRegistrationResult, registerProject } from '../lib/registerProject.js';
import { writeConfig, type RipeConfig } from '../lib/writeConfig.js';

export interface InitOptions {
  currentDirectoryName?: string;
  urlPromptFn?: () => Promise<string>;
  promptFn?: (question: string) => Promise<boolean>;
}

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

async function defaultUrlPromptFn(): Promise<string> {
  return ask('Server URL: ');
}

async function defaultPromptFn(question: string): Promise<boolean> {
  const answer = await ask(question);

  return answer.toLowerCase() === 'y';
}

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function init(options: InitOptions = {}): Promise<{ exitCode: 0 | 1 }> {
  const currentDirectoryName = options.currentDirectoryName ?? process.cwd();
  const urlPromptFn = options.urlPromptFn ?? defaultUrlPromptFn;
  const promptFn = options.promptFn ?? defaultPromptFn;
  const configPath = join(currentDirectoryName, '.ripe/config.json');

  if (existsSync(configPath)) {
    const existing = JSON.parse(readFileSync(configPath, 'utf-8')) as RipeConfig;
    console.warn(`.ripe/config.json already exists — project already registered as ${existing.projectId}.`);

    return { exitCode: 0 };
  }

  let serverUrl: string;
  while (true) {
    serverUrl = await urlPromptFn();
    if (isValidHttpUrl(serverUrl)) break;
    console.error(`Invalid server URL: "${serverUrl}". Must be a valid http or https URL.`);
  }

  const defaultProjectName = basename(currentDirectoryName);

  let result: ProjectRegistrationResult;
  try {
    result = await registerProject(serverUrl, defaultProjectName);
  } catch (err) {
    console.error(`Error: could not reach server at ${serverUrl}`);

    if (err instanceof Error) console.error(err.message);

    return { exitCode: 1 };
  }

  let message: string;

  if (result.status === 201) {
    message = `Project registered: ${result.projectId}`;
  } else {
    const useExisting = await promptFn(
      `A project named '${defaultProjectName}' is already registered on this server. Attach to it? (y/n) `
    );

    if (!useExisting) return { exitCode: 0 };

    message = `Using existing project ID: ${result.projectId}`;
  }

  writeConfig(configPath, { projectId: result.projectId, serverUrl });
  console.log(message);

  return { exitCode: 0 };
}
