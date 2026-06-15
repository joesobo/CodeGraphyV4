import { BaseEvaluator } from './baseEvaluator';
import type { FlagEvaluator } from './contract';
import type { FeatureFlag, RolloutDecision, RolloutRequest } from './types';

export class PercentageEvaluator extends BaseEvaluator implements FlagEvaluator {
  evaluate(flag: FeatureFlag, request: RolloutRequest): RolloutDecision {
    const userKey = request.userId.trim().toLowerCase();
    const enabled = userKey.length % 100 < flag.percentage;

    return {
      featureKey: flag.key,
      enabled,
      reason: enabled ? 'inside rollout' : 'outside rollout',
    };
  }
}
