/**
 * VS Code Extension Test Runner
 *
 * Launches a real VS Code instance with the extension loaded and runs the
 * Mocha test suite against it. Tests have access to the full `vscode` API.
 *
 * Run with: pnpm run test:e2e
 */
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { runTests } from '@vscode/test-electron';
import { e2eScenarios } from './scenarios';

function cleanupScenarioArtifacts(
  workspacePath: string,
  hadGitignore: boolean,
): void {
  fs.rmSync(path.join(workspacePath, '.codegraphy'), { recursive: true, force: true });

  const gitignorePath = path.join(workspacePath, '.gitignore');
  if (!hadGitignore) {
    fs.rmSync(gitignorePath, { force: true });
  }
}

async function main(): Promise<void> {
  const repoRoot = path.resolve(__dirname, '../../../..');
  // The compiled Mocha suite entry point
  const extensionTestsPath = path.resolve(__dirname, './suite/run');

  for (const scenario of e2eScenarios) {
    const vscodeProfilePath = fs.mkdtempSync(
      path.join(os.tmpdir(), `codegraphy-e2e-${scenario.name.replace(/[^a-z0-9-]/gi, '-')}-`),
    );
    const userDataPath = path.join(vscodeProfilePath, 'u');
    const extensionsPath = path.join(vscodeProfilePath, 'e');
    const extensionDevelopmentPath = [
      repoRoot,
      ...scenario.pluginDevelopmentRelativePaths.map((relativePath) =>
        path.resolve(repoRoot, relativePath),
      ),
    ];
    const workspacePath = path.resolve(repoRoot, scenario.workspaceRelativePath);
    const hadGitignore = fs.existsSync(path.join(workspacePath, '.gitignore'));

    try {
      await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        extensionTestsEnv: {
          CODEGRAPHY_E2E_SCENARIO: scenario.name,
        },
        launchArgs: [
          workspacePath,
          '--user-data-dir',
          userDataPath,
          '--extensions-dir',
          extensionsPath,
          // Disable other extensions so they don't interfere
          '--disable-extensions',
          // Don't show the welcome tab
          '--skip-welcome',
          '--skip-release-notes',
        ],
      });
    } finally {
      cleanupScenarioArtifacts(workspacePath, hadGitignore);
      fs.rmSync(vscodeProfilePath, { recursive: true, force: true });
    }
  }
}

main().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
