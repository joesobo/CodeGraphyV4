import { readDisclosures } from '../disclosures';
import type { CodeGraphyInstalledPluginRecord } from './contracts';
import { isRecord } from './values';

type InstalledPluginRecordFields = Pick<
  CodeGraphyInstalledPluginRecord,
  'apiVersion' | 'package' | 'packageRoot' | 'version'
>;

function readNonEmptyStringField(
  value: Record<string, unknown>,
  key: keyof InstalledPluginRecordFields,
): string | null {
  const field = value[key];
  return typeof field === 'string' && field.length > 0 ? field : null;
}

function readInstalledPluginRecordFields(
  value: Record<string, unknown>,
): InstalledPluginRecordFields | null {
  const packageName = readNonEmptyStringField(value, 'package');
  const version = readNonEmptyStringField(value, 'version');
  const apiVersion = readNonEmptyStringField(value, 'apiVersion');
  const packageRoot = readNonEmptyStringField(value, 'packageRoot');

  return packageName && version && apiVersion && packageRoot
    ? { package: packageName, version, apiVersion, packageRoot }
    : null;
}

export function normalizeInstalledPluginRecord(value: unknown): CodeGraphyInstalledPluginRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const fields = readInstalledPluginRecordFields(value);
  if (!fields) {
    return null;
  }

  const record: CodeGraphyInstalledPluginRecord = {
    package: fields.package,
    version: fields.version,
    apiVersion: fields.apiVersion,
    disclosures: readDisclosures(value.disclosures),
    packageRoot: fields.packageRoot,
  };

  if (isRecord(value.defaultOptions)) {
    record.defaultOptions = { ...value.defaultOptions };
  }

  return record;
}
