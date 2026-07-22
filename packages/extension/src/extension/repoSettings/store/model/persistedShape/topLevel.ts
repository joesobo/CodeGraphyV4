import {
  PHYSICS_SETTINGS_KEYS,
  TOP_LEVEL_SETTINGS_KEYS,
} from './allowedKeys';
import { pickObjectKeys } from './objectPick';

export function pickTopLevelSettings(value: unknown): Record<string, unknown> {
  const picked = pickObjectKeys(value, TOP_LEVEL_SETTINGS_KEYS) ?? {};

  normalizePersistedPhysics(picked);

  return picked;
}

export function normalizePersistedPhysics(settings: Record<string, unknown>): void {
  const physics = pickObjectKeys(settings.physics, PHYSICS_SETTINGS_KEYS);
  if (physics) {
    settings.physics = physics;
  }
}
