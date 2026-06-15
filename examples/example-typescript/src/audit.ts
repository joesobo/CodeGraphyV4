import type { RolloutDecision } from './types';

export function writeAudit(decision: RolloutDecision): string {
  return `${decision.featureKey}:${decision.enabled ? 'enabled' : 'disabled'}`;
}
