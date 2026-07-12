import {
  PHYSICS_SETTINGS_KEYS,
  TOP_LEVEL_SETTINGS_KEYS,
} from './allowedKeys';
import { pickObjectKeys } from './objectPick';

export function pickTopLevelSettings(value: unknown): Record<string, unknown> {
  const picked = pickObjectKeys(value, TOP_LEVEL_SETTINGS_KEYS) ?? {};

  const physics = pickObjectKeys(picked.physics, PHYSICS_SETTINGS_KEYS);
  if (physics) {
    picked.physics = physics;
  }

  return picked;
}
