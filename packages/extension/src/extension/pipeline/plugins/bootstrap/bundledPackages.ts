import * as fs from 'node:fs/promises';
import * as path from 'node:path';

function getCandidatePackagesRoots(extensionRoot: string): string[] {
  const roots = [path.join(extensionRoot, 'packages')];
  const parent = path.dirname(extensionRoot);
  if (path.basename(extensionRoot) === 'extension' && path.basename(parent) === 'packages') {
    roots.push(parent);
  }
  return roots;
}

async function readPackageDirectories(packagesRoot: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(packagesRoot, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(packagesRoot, entry.name));
  } catch {
    return [];
  }
}

export async function readBundledWorkspacePluginPackageRoots(
  extensionRoot: string | undefined,
): Promise<string[]> {
  if (!extensionRoot) {
    return [];
  }

  const packageRoots = await Promise.all(
    getCandidatePackagesRoots(extensionRoot).map(readPackageDirectories),
  );
  return [...new Set(packageRoots.flat())];
}
