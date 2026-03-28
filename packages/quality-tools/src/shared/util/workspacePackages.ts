import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

export interface WorkspacePackage {
  name: string;
  root: string;
}

type DirectoryEntry = {
  isDirectory(): boolean;
  name: string;
};

export function resolveWorkspacePackages(
  packagesRoot: string,
  entries: DirectoryEntry[]
): WorkspacePackage[] {
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      root: join(packagesRoot, entry.name)
    }))
    .filter((entry) => existsSync(join(entry.root, 'package.json')))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function listWorkspacePackages(repoRoot: string): WorkspacePackage[] {
  const packagesRoot = join(repoRoot, 'packages');
  return resolveWorkspacePackages(packagesRoot, readdirSync(packagesRoot, { withFileTypes: true }));
}
