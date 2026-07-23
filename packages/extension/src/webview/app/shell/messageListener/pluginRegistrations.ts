import type { WebviewPluginHost } from '../../../pluginHost/manager';
import type { ResetPluginAssets } from '../messageListener';
import { toPluginRegistrationCandidate, type PluginRegistrationCandidate } from './pluginRegistrations/candidate';
import { getPluginStatusEntries } from './pluginRegistrations/payload';
import { removePluginRuntime } from './pluginRegistrations/runtime';

export function reconcilePluginRegistrations(
  raw: { type?: unknown; payload?: unknown },
  pluginHost: WebviewPluginHost,
  resetPluginAssets: ResetPluginAssets | undefined,
  knownPluginIds: Set<string>,
): void {
  const plugins = getPluginStatusEntries(raw);
  if (!plugins) {
    return;
  }

  const candidates: PluginRegistrationCandidate[] = plugins
    .map(toPluginRegistrationCandidate)
    .filter((candidate): candidate is PluginRegistrationCandidate => candidate !== null);
  if (candidates.length !== plugins.length) {
    return;
  }

  const currentPluginIds = new Set<string>(candidates.map(candidate => candidate.id));
  for (const pluginId of knownPluginIds) {
    if (!currentPluginIds.has(pluginId)) {
      removePluginRuntime(pluginId, pluginHost, resetPluginAssets);
    }
  }

  for (const candidate of candidates) {
    applyPluginRegistration(candidate, pluginHost, resetPluginAssets);
  }

  knownPluginIds.clear();
  for (const pluginId of currentPluginIds) knownPluginIds.add(pluginId);
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
