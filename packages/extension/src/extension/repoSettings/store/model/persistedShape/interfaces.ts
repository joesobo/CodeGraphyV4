import { isPlainObject } from '../plainObject';
import {
  CODEGRAPHY_EXTENSION_INTERFACE_ID,
  CODEGRAPHY_EXTENSION_INTERFACE_SETTING_KEYS,
} from '../../../defaults';

type InterfaceEntry = { id: string; data: unknown };

export function normalizePersistedInterfaces(normalized: Record<string, unknown>): void {
  if (!('interfaces' in normalized)) return;
  if (!Array.isArray(normalized.interfaces)) {
    delete normalized.interfaces;
    return;
  }

  normalized.interfaces = normalized.interfaces.filter((entry) => (
    isPlainObject(entry)
    && typeof entry.id === 'string'
    && entry.id.trim().length > 0
    && 'data' in entry
  ));
}

export function mergeExtensionInterfaceDataIntoSettings(
  normalized: Record<string, unknown>,
): void {
  if (!Array.isArray(normalized.interfaces)) return;
  const entry = (normalized.interfaces as InterfaceEntry[])
    .find(candidate => candidate.id === CODEGRAPHY_EXTENSION_INTERFACE_ID);
  if (!entry || !isPlainObject(entry.data)) return;

  for (const key of CODEGRAPHY_EXTENSION_INTERFACE_SETTING_KEYS) {
    if (key in entry.data) normalized[key] = entry.data[key];
  }
}

export function moveExtensionSettingsIntoInterface(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const interfaces = Array.isArray(value.interfaces)
    ? value.interfaces.filter((entry): entry is InterfaceEntry => (
      isPlainObject(entry)
      && typeof entry.id === 'string'
      && 'data' in entry
    ))
    : [];
  const existing = interfaces.find(entry => entry.id === CODEGRAPHY_EXTENSION_INTERFACE_ID);
  const extensionData: Record<string, unknown> = isPlainObject(existing?.data)
    ? { ...existing.data }
    : {};
  const nested: Record<string, unknown> = { ...value };

  for (const key of CODEGRAPHY_EXTENSION_INTERFACE_SETTING_KEYS) {
    if (key in nested) extensionData[key] = nested[key];
    delete nested[key];
  }

  const extensionEntry: InterfaceEntry = {
    id: CODEGRAPHY_EXTENSION_INTERFACE_ID,
    data: extensionData,
  };
  const nextInterfaces: InterfaceEntry[] = [];
  let insertedExtensionEntry = false;
  for (const entry of interfaces) {
    if (entry.id !== CODEGRAPHY_EXTENSION_INTERFACE_ID) {
      nextInterfaces.push(entry);
      continue;
    }
    if (!insertedExtensionEntry) {
      nextInterfaces.push(extensionEntry);
      insertedExtensionEntry = true;
    }
  }
  if (!insertedExtensionEntry) nextInterfaces.push(extensionEntry);
  nested.interfaces = nextInterfaces;

  return nested;
}
