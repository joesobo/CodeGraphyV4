import type { WebviewPluginHost } from '../../../pluginHost/manager';
import type { ResetPluginAssets } from '../messageListener';
import { toPluginRegistrationCandidate, type PluginRegistrationCandidate } from './pluginRegistrations/candidate';
import { getPluginStatusEntries } from './pluginRegistrations/payload';
import { removePluginRuntime } from './pluginRegistrations/runtime';

export function reconcilePluginRegistrations(
  raw: { type?: unknown; payload?: unknown },
  pluginHost: WebviewPluginHost,
  resetPluginAssets?: ResetPluginAssets,
): void {
  const plugins = getPluginStatusEntries(raw);
  if (!plugins) {
    return;
  }

  for (const plugin of plugins) {
    const candidate = toPluginRegistrationCandidate(plugin);
    if (candidate) {
      applyPluginRegistration(candidate, pluginHost, resetPluginAssets);
    }
  }
}

function applyPluginRegistration(
  candidate: PluginRegistrationCandidate,
  pluginHost: WebviewPluginHost,
  resetPluginAssets?: ResetPluginAssets,
): void {
  if (candidate.enabled !== false && candidate.status !== 'unavailable') {
    return;
  }

  removePluginRuntime(candidate.id, pluginHost, resetPluginAssets);
}
