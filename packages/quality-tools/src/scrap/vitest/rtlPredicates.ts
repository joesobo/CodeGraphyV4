import { type ScrapExampleMetric } from '../types';

export function hasRtlMutation(ex: ScrapExampleMetric): boolean {
  return (ex.rtlMutationCount ?? 0) > 0;
}

export function isRtlQueryHeavy(ex: ScrapExampleMetric): boolean {
  return (
    (ex.rtlRenderCount ?? 0) > 0 &&
    (ex.rtlQueryCount ?? 0) >= 3 &&
    (ex.rtlMutationCount ?? 0) === 0
  );
}

export function hasRtlRender(ex: ScrapExampleMetric): boolean {
  return (ex.rtlRenderCount ?? 0) > 0;
}

export function hasSnapshot(ex: ScrapExampleMetric): boolean {
  return (ex.snapshotCount ?? 0) > 0;
}

export function hasTypeOnlyAssertion(ex: ScrapExampleMetric): boolean {
  return (ex.typeOnlyAssertionCount ?? 0) > 0;
}
