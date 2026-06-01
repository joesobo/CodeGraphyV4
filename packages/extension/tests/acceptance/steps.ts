import { createGraphViewAcceptanceContext } from './graphView/context';
import { graphViewAcceptanceSteps } from './graphView/steps';
import type { AcceptanceStepImplementation } from './graphView/types';

export const createAcceptanceContext = createGraphViewAcceptanceContext;

export const acceptanceSteps: Record<string, AcceptanceStepImplementation> = {
  ...graphViewAcceptanceSteps,
};
