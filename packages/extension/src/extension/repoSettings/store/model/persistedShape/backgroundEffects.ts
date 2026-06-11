import { normalizeBackgroundEffectsSettings } from '../../../../../shared/settings/backgroundEffects';

export function normalizePersistedBackgroundEffects(normalized: Record<string, unknown>): void {
  if (!('backgroundEffects' in normalized)) {
    return;
  }

  normalized.backgroundEffects = normalizeBackgroundEffectsSettings(normalized.backgroundEffects);
}
