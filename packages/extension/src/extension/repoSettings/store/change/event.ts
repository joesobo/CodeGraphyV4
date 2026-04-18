import { affectsSettingsConfiguration } from './configuration';
import type { ICodeGraphySettingsChangeEvent } from '../index';

export function createChangeEvent(changedKeys: string[]): ICodeGraphySettingsChangeEvent {
  const uniqueChangedKeys = Array.from(new Set(changedKeys));
  return {
    changedKeys: uniqueChangedKeys,
    affectsConfiguration: section => affectsSettingsConfiguration(uniqueChangedKeys, section),
  };
}
