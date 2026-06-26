import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { parseCodeGraphyPluginPackageManifest } from '../packageManifest';
import type { CodeGraphyInstalledPluginRecord } from './contracts';
import { readPluginUpdateImpact } from '../updateImpact';
import { isRecord } from './values';

type PluginPackageDisplayFields = Pick<
  CodeGraphyInstalledPluginRecord,
  'pluginId' | 'pluginName' | 'supportedExtensions' | 'updateImpact'
>;

interface PluginPackageStaticDescriptor extends PluginPackageDisplayFields {
  pluginId: string;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readSupportedExtensions(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((extension): extension is string => typeof extension === 'string' && extension.length > 0)
    : [];
}

function buildPluginPackageDisplayFields(
  descriptor: Record<string, unknown>,
): PluginPackageStaticDescriptor | null {
  const pluginId = readString(descriptor.id);
  if (!pluginId) {
    return null;
  }

  const pluginName = readString(descriptor.name);
  const supportedExtensions = readSupportedExtensions(descriptor.supportedExtensions);
  const updateImpact = readPluginUpdateImpact(descriptor.updateImpact);

  return {
    pluginId,
    ...(pluginName ? { pluginName } : {}),
    ...(supportedExtensions.length > 0 ? { supportedExtensions } : {}),
    ...(updateImpact ? { updateImpact } : {}),
  };
}

async function readPluginPackageDisplayFields(
  packageRoot: string,
): Promise<PluginPackageStaticDescriptor | null> {
  try {
    const descriptor = JSON.parse(
      await fsPromises.readFile(path.join(packageRoot, 'codegraphy.json'), 'utf-8'),
    ) as unknown;
    if (!isRecord(descriptor)) {
      return null;
    }

    return buildPluginPackageDisplayFields(descriptor);
  } catch {
    return null;
  }
}

function createMissingStaticPluginIdError(packageName: string): Error {
  return new Error(`Package '${packageName}' is missing codegraphy.json with a static plugin id.`);
}

export async function readPackageManifest(packageRoot: string): Promise<CodeGraphyInstalledPluginRecord | null> {
  try {
    const packageJson = JSON.parse(
      await fsPromises.readFile(path.join(packageRoot, 'package.json'), 'utf-8'),
    ) as unknown;
    const manifest = parseCodeGraphyPluginPackageManifest(packageJson);
    const descriptor = manifest ? await readPluginPackageDisplayFields(packageRoot) : null;
    return manifest
      && descriptor
      ? { ...manifest, ...descriptor, packageRoot }
      : null;
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

  const descriptor = await readPluginPackageDisplayFields(packageRoot);
  if (!descriptor) {
    throw createMissingStaticPluginIdError(packageName);
  }

  return { ...manifest, ...descriptor, packageRoot };
}
