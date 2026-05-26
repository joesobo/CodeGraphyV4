import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { parseCodeGraphyPluginPackageManifest } from '../packageManifest';
import type { CodeGraphyInstalledPluginRecord } from './contracts';

export async function readPackageManifest(packageRoot: string): Promise<CodeGraphyInstalledPluginRecord | null> {
  try {
    const packageJson = JSON.parse(
      await fsPromises.readFile(path.join(packageRoot, 'package.json'), 'utf-8'),
    ) as unknown;
    const manifest = parseCodeGraphyPluginPackageManifest(packageJson);
    return manifest ? { ...manifest, packageRoot } : null;
  } catch {
    return null;
  }
}

export async function readRequiredPackageManifest(
  packageName: string,
  packageRoot: string,
): Promise<CodeGraphyInstalledPluginRecord> {
  let packageJson: unknown;
  try {
    packageJson = JSON.parse(
      await fsPromises.readFile(path.join(packageRoot, 'package.json'), 'utf-8'),
    ) as unknown;
  } catch {
    throw new Error(
      `CodeGraphy plugin package '${packageName}' was not found in global npm package roots. ` +
      `Run \`npm i -g ${packageName}\` first.`,
    );
  }

  const manifest = parseCodeGraphyPluginPackageManifest(packageJson);
  if (!manifest) {
    throw new Error(`Package '${packageName}' is not a CodeGraphy plugin.`);
  }

  if (manifest.package !== packageName) {
    throw new Error(
      `Package '${packageName}' resolved to CodeGraphy plugin '${manifest.package}'.`,
    );
  }

  return { ...manifest, packageRoot };
}
