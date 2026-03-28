import { type ScrapExampleMetric } from '../types';
import {
  countExamples,
  hasAsyncWait,
  hasConcurrency,
  hasEnvMutation,
  hasFakeTimer,
  hasModuleMock
} from './predicates';
import {
  hasRtlMutation,
  isRtlQueryHeavy,
  hasRtlRender,
  hasSnapshot,
  hasTypeOnlyAssertion
} from './rtlPredicates';

export interface VitestSignalSummary {
  asyncWaitExampleCount: number;
  concurrencyExampleCount: number;
  envMutationExampleCount: number;
  fakeTimerExampleCount: number;
  moduleMockExampleCount: number;
  rtlMutationExampleCount: number;
  rtlQueryHeavyExampleCount: number;
  rtlRenderExampleCount: number;
  snapshotExampleCount: number;
  typeOnlyAssertionExampleCount: number;
}

export function summarizeVitestSignals(examples: ScrapExampleMetric[]): VitestSignalSummary {
  return {
    asyncWaitExampleCount: countExamples(examples, hasAsyncWait),
    concurrencyExampleCount: countExamples(examples, hasConcurrency),
    envMutationExampleCount: countExamples(examples, hasEnvMutation),
    fakeTimerExampleCount: countExamples(examples, hasFakeTimer),
    moduleMockExampleCount: countExamples(examples, hasModuleMock),
    rtlMutationExampleCount: countExamples(examples, hasRtlMutation),
    rtlQueryHeavyExampleCount: countExamples(examples, isRtlQueryHeavy),
    rtlRenderExampleCount: countExamples(examples, hasRtlRender),
    snapshotExampleCount: countExamples(examples, hasSnapshot),
    typeOnlyAssertionExampleCount: countExamples(examples, hasTypeOnlyAssertion)
  };
}
