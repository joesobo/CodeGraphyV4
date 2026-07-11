import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { parseCodeGraphyPluginPackageManifest } from '../packageManifest';
import type { CodeGraphyInstalledPluginRecord } from './contracts';
import { readPluginUpdateImpact } from '../updateImpact';
import { z } from 'zod';
import { looseStringArraySchema } from '../../values';

type PluginPackageDisplayFields = Pick<
  CodeGraphyInstalledPluginRecord,
  'minCoreVersion' | 'pluginId' | 'pluginName' | 'supportedExtensions' | 'updateImpact'
>;

interface PluginPackageStaticDescriptor extends PluginPackageDisplayFields {
  pluginId: string;
}

const packageDescriptorSchema = z.looseObject({
  id: z.string().min(1),
  name: z.string().min(1).optional().catch(undefined),
  supportedExtensions: looseStringArraySchema
    .transform(entries => entries.filter(entry => entry.length > 0)),
  updateImpact: z.unknown(),
  minCoreVersion: z.string().regex(/^\d+\.\d+\.\d+$/).optional().catch(undefined),
});

async function readPluginPackageDisplayFields(
  packageRoot: string,
): Promise<PluginPackageStaticDescriptor | null> {
  try {
    const descriptor = packageDescriptorSchema.safeParse(JSON.parse(
      await fsPromises.readFile(path.join(packageRoot, 'codegraphy.json'), 'utf-8'),
    ));
    if (!descriptor.success) {
      return null;
    }

    const { id: pluginId, minCoreVersion, name: pluginName, supportedExtensions } = descriptor.data;
    const updateImpact = readPluginUpdateImpact(descriptor.data.updateImpact);

    return {
      pluginId,
      ...(minCoreVersion ? { minCoreVersion } : {}),
      ...(pluginName ? { pluginName } : {}),
      ...(supportedExtensions.length > 0 ? { supportedExtensions } : {}),
      ...(updateImpact ? { updateImpact } : {}),
    };
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
