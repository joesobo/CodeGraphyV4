import { join, resolve } from 'node:path';
import { moduleDirectory } from './moduleDirectory';
import { packageRootFrom } from './packageRoot';
import { workspaceRootFrom } from './workspaceRoot';

export interface RepoRootOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  moduleUrl?: string;
}

function envRepoRoot(env: NodeJS.ProcessEnv): string | undefined {
  const configuredRoot = env.TEST_REPO_ROOT ?? env.GITHUB_WORKSPACE;
  return configuredRoot ? resolve(configuredRoot) : undefined;
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
