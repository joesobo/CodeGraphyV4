import type { IPhysicsSettings } from '../../../../shared/settings/physics';

interface GraphViewPhysicsConfigurationLike {
  update(key: string, value: unknown, target?: unknown): PromiseLike<void>;
}

interface GraphViewPhysicsConfigOptions {
  getConfiguration: () => GraphViewPhysicsConfigurationLike;
  getConfigTarget?: () => unknown;
}

function getGraphViewPhysicsSettingKeys(): Array<keyof IPhysicsSettings> {
  return ['repelForce', 'linkDistance', 'linkForce', 'damping', 'centerForce'];
}

async function updatePhysicsSetting(
  configuration: GraphViewPhysicsConfigurationLike,
  key: keyof IPhysicsSettings,
  value: number | undefined,
  target: unknown,
): Promise<void> {
  if (target === undefined) {
    await configuration.update(`physics.${key}`, value);
    return;
  }

  await configuration.update(`physics.${key}`, value, target);
}

export async function updateGraphViewPhysicsSetting(
  key: keyof IPhysicsSettings,
  value: number,
  { getConfiguration, getConfigTarget }: GraphViewPhysicsConfigOptions,
): Promise<void> {
  await updatePhysicsSetting(getConfiguration(), key, value, getConfigTarget?.());
}

export async function resetGraphViewPhysicsSettings(
  { getConfiguration, getConfigTarget }: GraphViewPhysicsConfigOptions,
): Promise<void> {
  const config = getConfiguration();
  const target = getConfigTarget?.();

  for (const key of getGraphViewPhysicsSettingKeys()) {
    await updatePhysicsSetting(config, key, undefined, target);
  }
}
