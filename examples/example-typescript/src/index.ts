import { readClock } from '@example/clock';
import { formatDecision } from './format';
import { evaluateCheckout } from './rollout';
import type { RolloutRequest } from './types';

export const demoRequest: RolloutRequest = {
  userId: 'pilot-user',
  requestedAt: readClock(),
};

const decision = evaluateCheckout(demoRequest);

console.log(formatDecision(decision));
