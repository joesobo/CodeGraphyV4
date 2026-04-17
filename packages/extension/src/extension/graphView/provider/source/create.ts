import type { GraphViewProviderMethodSource, GraphViewProviderMethodSourceOwner } from './contracts';
import { createGraphViewProviderAnalysisMethodDelegates } from './delegates/analysis';
import { createGraphViewProviderFileTimelineMethodDelegates } from './delegates/fileTimeline';
import { createGraphViewProviderPluginMethodDelegates } from './delegates/plugin';
import { createGraphViewProviderPublicMethodDelegates } from './delegates/public';
import { createGraphViewProviderSettingsMethodDelegates } from './delegates/settings';
import { createGraphViewProviderMethodStateProjection } from './state/projection';

export { type GraphViewProviderMethodSource, type GraphViewProviderMethodSourceOwner } from './contracts';

function attachDelegateProperties<TTarget extends object, TDelegates extends object>(
  target: TTarget,
  delegates: TDelegates,
): TTarget & TDelegates {
  for (const key of Object.keys(delegates) as Array<keyof TDelegates>) {
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: true,
      value: delegates[key],
      writable: true,
    });
  }

  return target as TTarget & TDelegates;
}

export function createGraphViewProviderMethodSource(
  owner: GraphViewProviderMethodSourceOwner,
): GraphViewProviderMethodSource {
  const source = createGraphViewProviderMethodStateProjection(owner);

  for (const createDelegates of [
    createGraphViewProviderAnalysisMethodDelegates,
    createGraphViewProviderSettingsMethodDelegates,
    createGraphViewProviderFileTimelineMethodDelegates,
    createGraphViewProviderPluginMethodDelegates,
    createGraphViewProviderPublicMethodDelegates,
  ]) {
    attachDelegateProperties(source, createDelegates(owner));
  }

  return source as GraphViewProviderMethodSource;
}
