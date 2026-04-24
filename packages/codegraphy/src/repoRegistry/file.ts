import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { RepoRegistryEntry, RepoRegistryFile } from './model';

const REGISTRY_DIRECTORY_NAME = '.codegraphy';
const REGISTRY_FILE_NAME = 'registry.json';

function getCodeGraphyHomeDirectory(): string {
  return process.env.CODEGRAPHY_HOME || os.homedir();
}

export function getRegistryDirectoryPath(): string {
  return path.join(getCodeGraphyHomeDirectory(), REGISTRY_DIRECTORY_NAME);
}

export function getRegistryFilePath(): string {
  return path.join(getRegistryDirectoryPath(), REGISTRY_FILE_NAME);
}

export function ensureRegistryDirectory(): string {
  const directoryPath = getRegistryDirectoryPath();
  fs.mkdirSync(directoryPath, { recursive: true });
  return directoryPath;
}

export function readRepoRegistry(): RepoRegistryFile {
  const filePath = getRegistryFilePath();
  if (!fs.existsSync(filePath)) {
    return { repos: [] };
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<RepoRegistryFile>;
    return {
      repos: Array.isArray(parsed.repos) ? parsed.repos.filter(isRepoRegistryEntry) : [],
    };
  } catch {
    return { repos: [] };
  }
}

function isRepoRegistryEntry(value: unknown): value is RepoRegistryEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.workspaceRoot === 'string'
    && typeof candidate.databasePath === 'string'
    && typeof candidate.lastSeenAt === 'string';
}

export function writeRepoRegistry(registry: RepoRegistryFile): void {
  ensureRegistryDirectory();
  fs.writeFileSync(getRegistryFilePath(), JSON.stringify(registry, null, 2));
}

export function upsertRepoRegistryEntry(entry: RepoRegistryEntry): RepoRegistryFile {
  const registry = readRepoRegistry();
  const nextRepos = registry.repos.filter((repo) => repo.workspaceRoot !== entry.workspaceRoot);
  nextRepos.push(entry);
  nextRepos.sort((left, right) => left.workspaceRoot.localeCompare(right.workspaceRoot));
  const nextRegistry = { repos: nextRepos };
  writeRepoRegistry(nextRegistry);
  return nextRegistry;
}
