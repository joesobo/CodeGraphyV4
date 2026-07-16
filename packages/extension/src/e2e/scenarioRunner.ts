import * as fs from 'fs';
import type { E2EScenario } from './scenarios';
import { maybeCleanupScenarioArtifacts } from './scenarioArtifacts';
import { scenarioLaunchArgs } from './scenarioLaunch';
import { createScenarioProfile } from './scenarioProfile';
import type { E2eTestRunner } from './testRunner';
import { prepareScenarioWorkspacePlugins } from './workspacePlugins';

export async function runE2eScenario(
  repoRoot: string,
  scenario: E2EScenario,
  runner: E2eTestRunner,
): Promise<void> {
  const profile = createScenarioProfile(repoRoot, scenario);
  const preserve = scenario.preserveWorkspaceCodegraphy === true;
  const originalHome = process.env.HOME;
  try {
    maybeCleanupScenarioArtifacts(profile.workspacePath, profile.hadGitignore, preserve);
    prepareScenarioWorkspacePlugins(
      scenario,
      repoRoot,
      profile.workspacePath,
      profile.homeDir,
      scenario.writeWorkspaceSettings !== false,
    );
    process.env.HOME = profile.homeDir;
    await runner.runTests({
      extensionDevelopmentPath: profile.extensionDevelopmentPath,
      extensionTestsPath: runner.extensionTestsPath,
      extensionTestsEnv: { CODEGRAPHY_E2E_SCENARIO: scenario.name, HOME: profile.homeDir },
      launchArgs: scenarioLaunchArgs(profile),
    });
  } finally {
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    maybeCleanupScenarioArtifacts(profile.workspacePath, profile.hadGitignore, preserve);
    fs.rmSync(profile.profilePath, { recursive: true, force: true });
  }
}
