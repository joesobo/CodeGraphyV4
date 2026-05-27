import { readDisclosures } from './disclosures';
import type { CodeGraphyPluginPackageManifest } from './packageManifest';
import { readDefaultOptions } from './packageManifestValues';

export function createCodeGraphyPluginPackageManifest(input: {
  apiVersion: string;
  codegraphy: Record<string, unknown>;
  packageName: string;
  version: string;
}): CodeGraphyPluginPackageManifest {
  const manifest: CodeGraphyPluginPackageManifest = {
    package: input.packageName,
    version: input.version,
    apiVersion: input.apiVersion,
    disclosures: readDisclosures(input.codegraphy.disclosures),
  };
  const defaultOptions = readDefaultOptions(input.codegraphy.defaultOptions);
  if (defaultOptions) {
    manifest.defaultOptions = defaultOptions;
  }

  return manifest;
}
