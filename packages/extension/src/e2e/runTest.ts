/**
 * VS Code Extension Test Runner
 *
 * Launches a real VS Code instance with the extension loaded and runs the
 * Mocha test suite against it. Tests have access to the full `vscode` API.
 *
 * Run with: pnpm run test:e2e
 */
import * as path from 'path';
import { runTests } from '@vscode/test-electron';
import { e2eScenarios } from './scenarios';

async function main(): Promise<void> {
  const repoRoot = path.resolve(__dirname, '../../../..');
  // The compiled Mocha suite entry point
  const extensionTestsPath = path.resolve(__dirname, './suite/run');

  for (const scenario of e2eScenarios) {
    const extensionDevelopmentPath = [
      repoRoot,
      ...scenario.pluginDevelopmentRelativePaths.map((relativePath) =>
        path.resolve(repoRoot, relativePath),
      ),
    ];
    const workspacePath = path.resolve(repoRoot, scenario.workspaceRelativePath);

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      extensionTestsEnv: {
        CODEGRAPHY_E2E_SCENARIO: scenario.name,
      },
      launchArgs: [
        workspacePath,
        // Disable other extensions so they don't interfere
        '--disable-extensions',
        // Don't show the welcome tab
        '--skip-welcome',
        '--skip-release-notes',
      ],
    });
  }
}

main().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
