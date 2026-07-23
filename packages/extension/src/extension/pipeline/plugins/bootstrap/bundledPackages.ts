import * as fs from 'node:fs/promises';
import { readFileSync, readdirSync } from 'node:fs';
import * as path from 'node:path';
import {
  parseCodeGraphyPluginPackageManifest,
  type CodeGraphyInstalledPluginRecord,
} from '@codegraphy-dev/core';

const BUNDLED_PLUGIN_PACKAGE_ROOTS_ENV = 'CODEGRAPHY_BUNDLED_PLUGIN_PACKAGE_ROOTS';

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

function readPackageDirectoriesSync(packagesRoot: string): string[] {
  try {
    return readdirSync(packagesRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(packagesRoot, entry.name));
  } catch {
    return [];
  }
}

function readEnvironmentPackageRoots(): string[] | undefined {
  if (!Object.prototype.hasOwnProperty.call(process.env, BUNDLED_PLUGIN_PACKAGE_ROOTS_ENV)) {
    return undefined;
  }
  return (process.env[BUNDLED_PLUGIN_PACKAGE_ROOTS_ENV] ?? '')
    .split(path.delimiter)
    .map(root => root.trim())
    .filter(Boolean);
}

export function readBundledWorkspacePluginPackageRootsSync(
  extensionRoot: string | undefined,
): string[] {
  const environmentRoots = readEnvironmentPackageRoots();
  if (environmentRoots) return environmentRoots;
  if (!extensionRoot) return [];

  return [...new Set(
    getCandidatePackagesRoots(extensionRoot).flatMap(readPackageDirectoriesSync),
  )];
}

export function readWorkspacePluginPackageRecords(
  packageRoots: Iterable<string>,
): CodeGraphyInstalledPluginRecord[] {
  return [...packageRoots].flatMap((packageRoot) => {
    try {
      const packageJson = JSON.parse(
        readFileSync(path.join(packageRoot, 'package.json'), 'utf-8'),
      ) as unknown;
      const manifest = parseCodeGraphyPluginPackageManifest(packageJson);
      if (!manifest) return [];
      return manifest.plugins.map(descriptor => ({
        package: manifest.package,
        version: manifest.version,
        packageRoot,
        globallyEnabled: false,
        ...descriptor,
      }));
    } catch {
      return [];
    }
  });
}

export function readBundledWorkspacePluginPackageRecords(
  extensionRoot: string | undefined,
): CodeGraphyInstalledPluginRecord[] {
  return readWorkspacePluginPackageRecords(
    readBundledWorkspacePluginPackageRootsSync(extensionRoot),
  );
}

export async function readBundledWorkspacePluginPackageRoots(
  extensionRoot: string | undefined,
): Promise<string[]> {
  const environmentRoots = readEnvironmentPackageRoots();
  if (environmentRoots) return environmentRoots;

  if (!extensionRoot) {
    return [];
  }

  const packageRoots = await Promise.all(
    getCandidatePackagesRoots(extensionRoot).map(readPackageDirectories),
  );
  return [...new Set(packageRoots.flat())];
}
