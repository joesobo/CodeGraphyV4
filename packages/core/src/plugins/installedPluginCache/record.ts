import { readDisclosures } from '../disclosures';
import type { CodeGraphyInstalledPluginRecord } from './contracts';
import { readPluginUpdateImpact } from '../updateImpact';
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

function readSupportedExtensions(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const supportedExtensions = value
    .filter((extension): extension is string => typeof extension === 'string' && extension.length > 0);
  return supportedExtensions.length > 0 ? supportedExtensions : undefined;
}

function addOptionalInstalledPluginRecordFields(
  record: CodeGraphyInstalledPluginRecord,
  value: Record<string, unknown>,
): void {
  if (isRecord(value.defaultOptions)) {
    record.defaultOptions = { ...value.defaultOptions };
  }
  if (typeof value.pluginId === 'string' && value.pluginId.length > 0) {
    record.pluginId = value.pluginId;
  }
  if (typeof value.pluginName === 'string' && value.pluginName.length > 0) {
    record.pluginName = value.pluginName;
  }
  const updateImpact = readPluginUpdateImpact(value.updateImpact);
  if (updateImpact) {
    record.updateImpact = updateImpact;
  }

  const supportedExtensions = readSupportedExtensions(value.supportedExtensions);
  if (supportedExtensions) {
    record.supportedExtensions = supportedExtensions;
  }
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

  addOptionalInstalledPluginRecordFields(record, value);
  return record;
}
