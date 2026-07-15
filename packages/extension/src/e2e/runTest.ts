/** Launches VS Code with the extension and runs the selected end-to-end scenarios. */
import { findRepoRoot } from './repoRoot';
import { runE2eScenario } from './scenarioRunner';
import { selectedE2eScenarios } from './scenarioSelection';
import { loadE2eTestRunner } from './testRunner';

async function main(): Promise<void> {
  const repoRoot = findRepoRoot(__dirname);
  const runner = loadE2eTestRunner(repoRoot);
  const scenarios = selectedE2eScenarios(process.env.CODEGRAPHY_E2E_ONLY_SCENARIO);
  for (const scenario of scenarios) await runE2eScenario(repoRoot, scenario, runner);
}

main().catch((error: unknown) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
