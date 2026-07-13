import { isPlainObject } from './plainObject';

const CURRENT_SETTINGS_VERSION = 2;
const HISTORICAL_DAMPING_DEFAULT = 0.7;
const HISTORICAL_LINK_FORCE_DEFAULT = 0.15;

export function migratePersistedSettings(value: unknown): unknown {
  if (!isPlainObject(value) || value.version !== 1) return value;
  const migrated: Record<string, unknown> = {
    ...value,
    version: CURRENT_SETTINGS_VERSION,
  };
  if (!isPlainObject(value.physics)) return migrated;
  const physics = { ...value.physics };
  if (physics.damping === HISTORICAL_DAMPING_DEFAULT) physics.damping = 0.4;
  if (physics.linkForce === HISTORICAL_LINK_FORCE_DEFAULT) physics.linkForce = 1;
  migrated.physics = physics;
  return migrated;
}
