import type { FeatureFlag, RolloutDecision, RolloutRequest } from './types';

export interface FlagEvaluator {
  evaluate(flag: FeatureFlag, request: RolloutRequest): RolloutDecision;
}
