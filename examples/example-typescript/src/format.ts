import type { RolloutDecision } from './types';

export function formatDecision(decision: RolloutDecision): string {
  return `${decision.featureKey} is ${decision.enabled ? 'on' : 'off'}: ${decision.reason}`;
}
