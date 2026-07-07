import { z } from 'zod';
import { satisfiesSemverRange } from './apiVersion';
import type { CodeGraphyPluginDisclosure } from './disclosures';
import type { IPluginUpdateImpactPolicy } from '@codegraphy-dev/plugin-api';
import { CORE_PLUGIN_API_VERSION } from './api';
import { createCodeGraphyPluginPackageManifest } from './packageManifestBuild';

const pluginPackageJsonSchema = z.looseObject({
  name: z.string().catch(''),
  version: z.string().catch(''),
  codegraphy: z.looseObject({
    type: z.unknown(),
    apiVersion: z.string().catch(''),
  }),
});

export type { CodeGraphyPluginDisclosure };

export interface CodeGraphyPluginPackageManifest {
  package: string;
  version: string;
  apiVersion: string;
  defaultOptions?: Record<string, unknown>;
  updateImpact?: IPluginUpdateImpactPolicy;
  disclosures: CodeGraphyPluginDisclosure[];
}

export function parseCodeGraphyPluginPackageManifest(
  packageJson: unknown,
): CodeGraphyPluginPackageManifest | null {
  const parsed = pluginPackageJsonSchema.safeParse(packageJson);
  if (!parsed.success) {
    return null;
  }

  const { name: packageName, version, codegraphy } = parsed.data;
  const apiVersion = codegraphy.apiVersion;

  if (
    packageName.length === 0
    || version.length === 0
    || codegraphy.type !== 'plugin'
    || apiVersion.length === 0
  ) {
    return null;
  }

  if (!satisfiesSemverRange(CORE_PLUGIN_API_VERSION, apiVersion)) {
    throw new Error(
      `Plugin '${packageName}' targets unsupported CodeGraphy Plugin API '${apiVersion}'.`,
    );
  }

  return createCodeGraphyPluginPackageManifest({
    apiVersion,
    codegraphy,
    packageName,
    version,
  });
}
