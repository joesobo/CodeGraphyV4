import { satisfiesSemverRange } from './apiVersion';
import type { CodeGraphyPluginDisclosure } from './disclosures';
import type { IPluginUpdateImpactPolicy } from '@codegraphy-dev/plugin-api';
import { CORE_PLUGIN_API_VERSION } from './api';
import { createCodeGraphyPluginPackageManifest } from './packageManifestBuild';
import { isRecord, readRequiredString } from './packageManifestValues';

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
  if (!isRecord(packageJson) || !isRecord(packageJson.codegraphy)) {
    return null;
  }

  const packageName = readRequiredString(packageJson.name);
  const version = readRequiredString(packageJson.version);
  const apiVersion = readRequiredString(packageJson.codegraphy.apiVersion);

  if (
    packageName.length === 0
    || version.length === 0
    || packageJson.codegraphy.type !== 'plugin'
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
    codegraphy: packageJson.codegraphy,
    packageName,
    version,
  });
}
