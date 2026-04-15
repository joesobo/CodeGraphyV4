import { affectsSettingsConfiguration } from './storeAffectsConfiguration';
import type { ICodeGraphySettingsChangeEvent } from './store';

export function createChangeEvent(changedKeys: string[]): ICodeGraphySettingsChangeEvent {
  const uniqueChangedKeys = Array.from(new Set(changedKeys));
  return {
    changedKeys: uniqueChangedKeys,
    affectsConfiguration: section => affectsSettingsConfiguration(uniqueChangedKeys, section),
  };
}
