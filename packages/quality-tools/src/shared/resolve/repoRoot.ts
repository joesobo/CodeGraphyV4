import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface RepoRootOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  moduleUrl?: string;
}

function envRepoRoot(env: NodeJS.ProcessEnv): string | undefined {
  const configuredRoot = env.TEST_REPO_ROOT ?? env.GITHUB_WORKSPACE;
  return configuredRoot ? resolve(configuredRoot) : undefined;
}

function moduleDirectory(moduleUrl?: string): string | undefined {
  if (!moduleUrl) {
    return undefined;
  }

  if (moduleUrl.startsWith('file:')) {
    return dirname(fileURLToPath(moduleUrl));
  }

  if (moduleUrl.startsWith('/')) {
    return dirname(moduleUrl);
  }

  return undefined;
}

function workspaceRootFrom(start?: string): string | undefined {
  if (!start) {
    return undefined;
  }

  let currentDirectory = resolve(start);

  while (true) {
    if (existsSync(join(currentDirectory, 'pnpm-workspace.yaml'))) {
      return currentDirectory;
    }

    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      return undefined;
    }

    currentDirectory = parentDirectory;
  }
}

function packageRootFrom(repoRoot: string, start?: string): string | undefined {
  if (!start) {
    return undefined;
  }

  let currentDirectory = resolve(start);

  while (currentDirectory !== repoRoot) {
    if (existsSync(join(currentDirectory, 'package.json'))) {
      return currentDirectory;
    }

    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      return undefined;
    }

    currentDirectory = parentDirectory;
  }

  return undefined;
}

export function resolveRepoRoot(options: RepoRootOptions = {}): string {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const moduleUrl = options.moduleUrl ?? import.meta.url;

  const configuredRepoRoot = envRepoRoot(env);
  if (configuredRepoRoot) {
    return configuredRepoRoot;
  }

  const moduleWorkspaceRoot = workspaceRootFrom(moduleDirectory(moduleUrl));
  if (moduleWorkspaceRoot) {
    return moduleWorkspaceRoot;
  }

  const cwdWorkspaceRoot = workspaceRootFrom(cwd);
  if (cwdWorkspaceRoot) {
    return cwdWorkspaceRoot;
  }

  throw new Error(`Unable to resolve repo root from module URL "${moduleUrl}" and cwd "${cwd}"`);
}

export function resolvePackageRoot(options: RepoRootOptions = {}): string {
  const repoRoot = resolveRepoRoot(options);
  const moduleUrl = options.moduleUrl ?? import.meta.url;
  const modulePath = moduleDirectory(moduleUrl);
  const discoveredPackageRoot = packageRootFrom(repoRoot, modulePath);

  if (discoveredPackageRoot) {
    return discoveredPackageRoot;
  }

  return join(repoRoot, 'packages', 'quality-tools');
}

export const REPO_ROOT = resolveRepoRoot();
export const PACKAGE_ROOT = resolvePackageRoot();
