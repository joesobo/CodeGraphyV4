import type { ICodeGraphyRepoSettings } from '../../defaults';
import { isPlainObject } from '../model/plainObject';
import { normalizePersistedSettingsShape } from '../model/persistedShape';
import { moveExtensionSettingsIntoInterface } from '../model/persistedShape/interfaces';

export function serializeSettings(value: ICodeGraphyRepoSettings): string {
  const synchronized = moveExtensionSettingsIntoInterface(value as unknown as Record<string, unknown>);
  const normalized = normalizePersistedSettingsShape(synchronized);

  if (Array.isArray(normalized.legend)) {
    normalized.legend = normalized.legend
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

  const persisted = moveExtensionSettingsIntoInterface(normalized);

  return `${JSON.stringify(persisted, null, 2)}\n`;
}
