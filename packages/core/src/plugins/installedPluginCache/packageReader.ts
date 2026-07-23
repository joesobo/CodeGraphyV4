import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { parseCodeGraphyPluginPackageManifest } from '../packageManifest';
import type { CodeGraphyInstalledPluginRecord } from './contracts';

function createInstalledRecords(
  packageRoot: string,
  manifest: NonNullable<ReturnType<typeof parseCodeGraphyPluginPackageManifest>>,
): CodeGraphyInstalledPluginRecord[] {
  return manifest.plugins.map(plugin => ({
    package: manifest.package,
    version: manifest.version,
    packageRoot,
    globallyEnabled: false,
    ...plugin,
  }));
}

async function readPackageJson(packageRoot: string): Promise<unknown> {
  return JSON.parse(
    await fsPromises.readFile(path.join(packageRoot, 'package.json'), 'utf-8'),
  ) as unknown;
}

export async function readPackageManifest(
  packageRoot: string,
): Promise<CodeGraphyInstalledPluginRecord[] | null> {
  try {
    const manifest = parseCodeGraphyPluginPackageManifest(await readPackageJson(packageRoot));
    return manifest ? createInstalledRecords(packageRoot, manifest) : null;
  } catch {
    return null;
  }
}

export async function readRequiredPackageManifest(
  packageName: string,
  packageRoot: string,
): Promise<CodeGraphyInstalledPluginRecord[]> {
  let packageJson: unknown;
  try {
    packageJson = await readPackageJson(packageRoot);
  } catch {
    throw new Error(
      `CodeGraphy plugin package '${packageName}' was not found in global npm package roots. `
      + `Run \`npm i -g ${packageName}\` first.`,
    );
  }

  const manifest = parseCodeGraphyPluginPackageManifest(packageJson);
  if (!manifest) {
    throw new Error(`Package '${packageName}' is not a CodeGraphy plugin.`);
  }
  if (manifest.package !== packageName) {
    throw new Error(
      `Package '${packageName}' resolved to CodeGraphy plugin package '${manifest.package}'.`,
    );
  }

  return createInstalledRecords(packageRoot, manifest);
}
