import type { IPhysicsSettings } from '../../shared/types';

interface GraphViewPhysicsConfigurationLike {
  update(key: string, value: unknown, target: unknown): PromiseLike<void>;
}

interface GraphViewPhysicsConfigOptions {
  getConfiguration: () => GraphViewPhysicsConfigurationLike;
  getConfigTarget: () => unknown;
}

const PHYSICS_SETTING_KEYS: Array<keyof IPhysicsSettings> = [
  'repelForce',
  'linkDistance',
  'linkForce',
  'damping',
  'centerForce',
];

export async function updateGraphViewPhysicsSetting(
  key: keyof IPhysicsSettings,
  value: number,
  { getConfiguration, getConfigTarget }: GraphViewPhysicsConfigOptions,
): Promise<void> {
  await getConfiguration().update(key, value, getConfigTarget());
}

export async function resetGraphViewPhysicsSettings(
  { getConfiguration, getConfigTarget }: GraphViewPhysicsConfigOptions,
): Promise<void> {
  const config = getConfiguration();
  const target = getConfigTarget();

  for (const key of PHYSICS_SETTING_KEYS) {
    await config.update(key, undefined, target);
  }
}
