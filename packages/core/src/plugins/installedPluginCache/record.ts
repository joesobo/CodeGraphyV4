import { readDisclosures } from '../disclosures';
import type { CodeGraphyInstalledPluginRecord } from './contracts';
import { isRecord } from './values';

export function normalizeInstalledPluginRecord(value: unknown): CodeGraphyInstalledPluginRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const packageName = typeof value.package === 'string' ? value.package : '';
  const version = typeof value.version === 'string' ? value.version : '';
  const apiVersion = typeof value.apiVersion === 'string' ? value.apiVersion : '';
  const packageRoot = typeof value.packageRoot === 'string' ? value.packageRoot : '';
  if (
    packageName.length === 0
    || version.length === 0
    || apiVersion.length === 0
    || packageRoot.length === 0
  ) {
    return null;
  }

  const record: CodeGraphyInstalledPluginRecord = {
    package: packageName,
    version,
    apiVersion,
    disclosures: readDisclosures(value.disclosures),
    packageRoot,
  };

  if (isRecord(value.defaultOptions)) {
    record.defaultOptions = { ...value.defaultOptions };
  }

  return record;
}
