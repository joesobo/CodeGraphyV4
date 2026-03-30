import type { GraphViewProviderMethodSource, GraphViewProviderMethodSourceOwner } from './contracts';
import { createGraphViewProviderAnalysisMethodDelegates } from './analysisDelegates';
import { createGraphViewProviderFileTimelineMethodDelegates } from './fileTimelineDelegates';
import { createGraphViewProviderPublicMethodDelegates } from './publicDelegates';
import { createGraphViewProviderSettingsMethodDelegates } from './settingsDelegates';
import { createGraphViewProviderMethodStateSource } from './state';

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
  const source = createGraphViewProviderMethodStateSource(owner);

  for (const createDelegates of [
    createGraphViewProviderAnalysisMethodDelegates,
    createGraphViewProviderSettingsMethodDelegates,
    createGraphViewProviderFileTimelineMethodDelegates,
    createGraphViewProviderPublicMethodDelegates,
  ]) {
    attachDelegateProperties(source, createDelegates(owner));
  }

  return source as GraphViewProviderMethodSource;
}
