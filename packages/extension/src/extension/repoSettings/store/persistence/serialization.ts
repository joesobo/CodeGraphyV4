import type { ICodeGraphyRepoSettings } from '../../defaults';
import { isPlainObject } from '../model/plainObject';
import { normalizePersistedSettingsShape } from '../model/persistedShape';

function dropDuplicateRecordIdentity(
  records: unknown,
  identityKey: 'id' | 'nodeId',
): void {
  if (!isPlainObject(records)) {
    return;
  }

  for (const [recordKey, value] of Object.entries(records)) {
    if (!isPlainObject(value) || value[identityKey] !== recordKey) {
      continue;
    }

    delete value[identityKey];
  }
}

function groupGraphLayoutOwnership(graphLayout: Record<string, unknown>): void {
  if (!isPlainObject(graphLayout.ownership)) {
    return;
  }

  const ownership: Record<string, string[]> = {};
  for (const [itemId, record] of Object.entries(graphLayout.ownership)) {
    if (isPlainObject(record) && typeof record.ownerSectionId === 'string') {
      ownership[record.ownerSectionId] = ownership[record.ownerSectionId] ?? [];
      ownership[record.ownerSectionId].push(itemId);
    }
  }

  graphLayout.ownership = ownership;
}

function compactGraphLayoutSettings(persisted: Record<string, unknown>): void {
  if (!isPlainObject(persisted.graphLayout)) {
    return;
  }

  dropDuplicateRecordIdentity(persisted.graphLayout.pinnedNodes, 'nodeId');
  dropDuplicateRecordIdentity(persisted.graphLayout.sections, 'id');
  groupGraphLayoutOwnership(persisted.graphLayout);
}

export function serializeSettings(value: ICodeGraphyRepoSettings): string {
  const persisted = normalizePersistedSettingsShape(value);
  compactGraphLayoutSettings(persisted);

  if (Array.isArray(persisted.legend)) {
    persisted.legend = persisted.legend
      .filter(isPlainObject)
      .map((rule) => {
        const serializedRule = { ...rule };
        delete serializedRule.id;
        delete serializedRule.imageUrl;
        delete serializedRule.isPluginDefault;
        delete serializedRule.pluginName;
        return serializedRule;
      });
  }

  return `${JSON.stringify(persisted, null, 2)}\n`;
}
