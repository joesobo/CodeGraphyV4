import { DEFAULT_PHYSICS_SETTINGS } from '../../../../shared/settings/physics';
import { isPlainObject } from './plainObject';

const CURRENT_SETTINGS_VERSION = 3;
const HISTORICAL_DAMPING_DEFAULT = 0.7;
const HISTORICAL_LINK_FORCE_DEFAULT = 0.15;

export function migratePersistedSettings(value: unknown): unknown {
  if (!isPlainObject(value) || (value.version !== 1 && value.version !== 2)) return value;
  const migrated: Record<string, unknown> = {
    ...value,
    version: CURRENT_SETTINGS_VERSION,
  };
  if (value.version !== 1 || !isPlainObject(value.physics)) return migrated;
  const physics = { ...value.physics };
  if (physics.damping === HISTORICAL_DAMPING_DEFAULT) {
    physics.damping = DEFAULT_PHYSICS_SETTINGS.damping;
  }
  if (physics.linkForce === HISTORICAL_LINK_FORCE_DEFAULT) {
    physics.linkForce = DEFAULT_PHYSICS_SETTINGS.linkForce;
  }
  migrated.physics = physics;
  return migrated;
}
