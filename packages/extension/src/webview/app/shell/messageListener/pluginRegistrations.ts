import type { WebviewPluginHost } from '../../../pluginHost/manager';
import type { ResetPluginAssets } from '../messageListener';
import { toPluginRegistrationCandidate, type PluginRegistrationCandidate } from './pluginRegistrations/candidate';
import { getPluginStatusEntries } from './pluginRegistrations/payload';
import { removePackageRuntimePlugin, removePluginRuntime } from './pluginRegistrations/runtime';

export function removeDisabledPluginRegistrations(
  raw: { type?: unknown; payload?: unknown },
  pluginHost: WebviewPluginHost,
  packagePluginIdsByPackageName: Map<string, string>,
  resetPluginAssets?: ResetPluginAssets,
): void {
  const plugins = getPluginStatusEntries(raw);
  if (!plugins) {
    return;
  }

  for (const plugin of plugins) {
    const candidate = toPluginRegistrationCandidate(plugin);
    if (candidate) {
      applyPluginRegistration(candidate, pluginHost, packagePluginIdsByPackageName, resetPluginAssets);
    }
  }
}

function applyPluginRegistration(
  candidate: PluginRegistrationCandidate,
  pluginHost: WebviewPluginHost,
  packagePluginIdsByPackageName: Map<string, string>,
  resetPluginAssets?: ResetPluginAssets,
): void {
  if (candidate.enabled !== false && candidate.packageName) {
    packagePluginIdsByPackageName.set(candidate.packageName, candidate.id);
    return;
  }

  if (candidate.enabled !== false) {
    return;
  }

  removePluginRuntime(candidate.id, pluginHost, resetPluginAssets);
  removePackageRuntimePlugin(
    candidate.packageName,
    candidate.id,
    pluginHost,
    packagePluginIdsByPackageName,
    resetPluginAssets,
  );
}
