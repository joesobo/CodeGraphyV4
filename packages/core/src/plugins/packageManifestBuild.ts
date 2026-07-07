import { readDisclosures } from './disclosures';
import type { CodeGraphyPluginPackageManifest } from './packageManifest';
import { unknownRecordSchema } from '../values';
import { readPluginUpdateImpact } from './updateImpact';

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
  const defaultOptions = unknownRecordSchema.safeParse(input.codegraphy.defaultOptions);
  if (defaultOptions.success) {
    manifest.defaultOptions = { ...defaultOptions.data };
  }
  const updateImpact = readPluginUpdateImpact(input.codegraphy.updateImpact);
  if (updateImpact) {
    manifest.updateImpact = updateImpact;
  }

  return manifest;
}
