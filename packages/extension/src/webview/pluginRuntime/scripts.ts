import { getPluginApi } from './api';
import { runPluginActivation } from './activation';
import type { PluginManagerRefs } from './types';

type ScriptRefs = Pick<
  PluginManagerRefs,
  'activatedScriptKeys' | 'activatingScriptPromises' | 'pluginActivationCleanups' | 'pluginApis'
  | 'pluginAssetVersions' | 'pluginHost' | 'pluginData'
>;

export async function activatePluginScript(
  refs: ScriptRefs,
  pluginId: string,
  script: string,
): Promise<void> {
  const activationKey = `${pluginId}::${script}`;
  if (refs.activatedScriptKeys.current.has(activationKey)) return;
  const pendingActivation = refs.activatingScriptPromises.current.get(activationKey);
  if (pendingActivation) {
    await pendingActivation;
    return;
  }
  const activationVersion = refs.pluginAssetVersions.current.get(pluginId) ?? 0;
  const activationPromise = runPluginActivation(
    {
      cleanups: refs.pluginActivationCleanups,
      getApi: () => getPluginApi(refs, pluginId, activationVersion),
      versions: refs.pluginAssetVersions,
    },
    pluginId,
    script,
    activationKey,
    activationVersion,
  ).then((activated) => {
    if (activated) refs.activatedScriptKeys.current.add(activationKey);
  });
  refs.activatingScriptPromises.current.set(activationKey, activationPromise);
  try {
    await activationPromise;
  } finally {
    if (refs.activatingScriptPromises.current.get(activationKey) === activationPromise) {
      refs.activatingScriptPromises.current.delete(activationKey);
    }
  }
}

export function resetPluginScriptState(
  refs: Pick<PluginManagerRefs, 'activatedScriptKeys' | 'activatingScriptPromises' | 'pluginActivationCleanups'>,
  pluginId: string,
): void {
  const cleanups = refs.pluginActivationCleanups.current.get(pluginId);
  for (const cleanup of cleanups ?? []) {
    try {
      cleanup.dispose();
    } catch (error) {
      console.error(`[CodeGraphy] Failed to clean up webview plugin '${pluginId}':`, error);
    }
  }
  refs.pluginActivationCleanups.current.delete(pluginId);
  const activationPrefix = `${pluginId}::`;
  for (const key of refs.activatedScriptKeys.current) {
    if (key.startsWith(activationPrefix)) refs.activatedScriptKeys.current.delete(key);
  }
  for (const key of refs.activatingScriptPromises.current.keys()) {
    if (key.startsWith(activationPrefix)) refs.activatingScriptPromises.current.delete(key);
  }
}
