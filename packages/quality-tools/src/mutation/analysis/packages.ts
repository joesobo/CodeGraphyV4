import { existsSync } from 'fs';
import { join } from 'path';
import { type WorkspacePackage, listWorkspacePackages } from '../../shared/util/workspacePackages';

function hasSourceDirectory(workspacePackage: WorkspacePackage): boolean {
  return existsSync(join(workspacePackage.root, 'src'));
}

function hasMutationTests(workspacePackage: WorkspacePackage): boolean {
  return existsSync(join(workspacePackage.root, 'tests')) ||
    existsSync(join(workspacePackage.root, '__tests__')) ||
    workspacePackage.name === 'extension';
}

function sortMutationPackageNames(packageNames: string[]): string[] {
  const nonExtensionPackages = packageNames
    .filter((packageName) => packageName !== 'extension')
    .sort((left, right) => left.localeCompare(right));

  return packageNames.includes('extension')
    ? [...nonExtensionPackages, 'extension']
    : nonExtensionPackages;
}

export function discoverMutationPackageNames(repoRoot: string): string[] {
  return sortMutationPackageNames(listWorkspacePackages(repoRoot)
    .filter(hasSourceDirectory)
    .filter(hasMutationTests)
    .map((workspacePackage): string => workspacePackage.name));
}
