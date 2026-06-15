import { writeAudit } from './audit';
import { checkoutFlag } from './config';
import { PercentageEvaluator } from './evaluator';
import type { RolloutDecision, RolloutRequest } from './types';

export function evaluateCheckout(request: RolloutRequest): RolloutDecision {
  const evaluator = new PercentageEvaluator();
  const decision = evaluator.evaluate(checkoutFlag, request);

  writeAudit(decision);

  return decision;
}
