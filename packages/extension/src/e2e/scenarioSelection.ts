import { e2eScenarios, type E2EScenario } from './scenarios';

export function selectedE2eScenarios(name: string | undefined): readonly E2EScenario[] {
  const selected = name
    ? e2eScenarios.filter(scenario => scenario.name === name)
    : e2eScenarios.filter(scenario => scenario.runByDefault !== false);
  if (name && selected.length === 0) throw new Error(`Unknown e2e scenario: ${name}`);
  return selected;
}
