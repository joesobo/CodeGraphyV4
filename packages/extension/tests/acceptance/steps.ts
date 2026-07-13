import { createGraphViewAcceptanceContext } from './graphView/context';
import { graphViewAcceptanceStepExpressions, graphViewAcceptanceSteps } from './graphView/steps';
import { settingsAcceptanceStepExpressions, settingsAcceptanceSteps } from './settings/steps';

export const createAcceptanceContext = createGraphViewAcceptanceContext;

export const acceptanceStepExpressions = [
  ...graphViewAcceptanceStepExpressions,
  ...settingsAcceptanceStepExpressions,
];

export const acceptanceSteps = new Proxy(settingsAcceptanceSteps, {
  get(target, property) {
    if (typeof property !== 'string') return Reflect.get(target, property);
    return target[property] ?? graphViewAcceptanceSteps[property];
  },
});
