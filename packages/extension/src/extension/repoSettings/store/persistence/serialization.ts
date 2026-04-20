import type { ICodeGraphyRepoSettings } from '../../defaults';
import { isPlainObject } from '../model/plainObject';
import { normalizePersistedSettingsShape } from '../model/persistedShape';

export function serializeSettings(value: ICodeGraphyRepoSettings): string {
  const persisted = normalizePersistedSettingsShape(value);

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
