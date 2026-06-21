/**
 * VS Code Extension Test Runner
 *
 * Launches a real VS Code instance with the extension loaded and runs the
 * Mocha test suite against it. Tests have access to the full `vscode` API.
 *
 * Run smoke subset with: pnpm run test:vscode
 * Run full local suite with: CODEGRAPHY_E2E_FULL=1 pnpm run test:vscode
 */
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { createRequire } from 'module';
import { e2eScenarios } from './scenarios';
import { prepareScenarioWorkspacePlugins } from './workspacePlugins';
import type { runTests as runVSCodeTests } from '@vscode/test-electron';

function findRepoRoot(startDir: string): string {
  let currentDir = startDir;

  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
      return currentDir;
    }

    currentDir = path.dirname(currentDir);
  }

  throw new Error(`Unable to locate repo root from ${startDir}`);
}

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

function maybeCleanupScenarioArtifacts(
  workspacePath: string,
  hadGitignore: boolean,
  preserveWorkspaceCodegraphy: boolean,
): void {
  if (preserveWorkspaceCodegraphy) {
    return;
  }

  cleanupScenarioArtifacts(workspacePath, hadGitignore);
}

async function main(): Promise<void> {
  const repoRoot = findRepoRoot(__dirname);
  const requireFromExtension = createRequire(
    path.join(repoRoot, 'packages/extension/package.json'),
  );
  const { runTests } = requireFromExtension('@vscode/test-electron') as {
    runTests: typeof runVSCodeTests;
  };
  const extensionTestsPath = path.resolve(
    repoRoot,
    'packages/extension/dist-e2e/extension/src/e2e/suite/run',
  );

  const selectedScenarioName = process.env.CODEGRAPHY_E2E_ONLY_SCENARIO;
  const selectedScenarios = selectedScenarioName
    ? e2eScenarios.filter(scenario => scenario.name === selectedScenarioName)
    : e2eScenarios.filter(scenario => scenario.runByDefault !== false);

  if (selectedScenarioName && selectedScenarios.length === 0) {
    throw new Error(`Unknown e2e scenario: ${selectedScenarioName}`);
  }

  for (const scenario of selectedScenarios) {
    const vscodeProfilePath = fs.mkdtempSync(
      path.join(os.tmpdir(), `codegraphy-e2e-${scenario.name.replace(/[^a-z0-9-]/gi, '-')}-`),
    );
    const userDataPath = path.join(vscodeProfilePath, 'u');
    const extensionsPath = path.join(vscodeProfilePath, 'e');
    const homeDir = path.join(vscodeProfilePath, 'home');
    const extensionDevelopmentPath = [
      repoRoot,
      ...scenario.pluginDevelopmentRelativePaths.map((relativePath) =>
        path.resolve(repoRoot, relativePath),
      ),
    ];
    const workspacePath = path.resolve(repoRoot, scenario.workspaceRelativePath);
    const hadGitignore = fs.existsSync(path.join(workspacePath, '.gitignore'));
    const originalHome = process.env.HOME;

    try {
      maybeCleanupScenarioArtifacts(
        workspacePath,
        hadGitignore,
        scenario.preserveWorkspaceCodegraphy === true,
      );
      prepareScenarioWorkspacePlugins(
        scenario,
        repoRoot,
        workspacePath,
        homeDir,
        scenario.writeWorkspaceSettings !== false,
      );
      process.env.HOME = homeDir;
      await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        extensionTestsEnv: {
          CODEGRAPHY_E2E_SCENARIO: scenario.name,
          HOME: homeDir,
        },
        launchArgs: [
          workspacePath,
          '--user-data-dir',
          userDataPath,
          '--extensions-dir',
          extensionsPath,
          '--use-inmemory-secretstorage',
          '--sync',
          'off',
          '--disable-telemetry',
          '--disable-updates',
          '--disable-workspace-trust',
          // Disable other extensions so they don't interfere
          '--disable-extensions',
          // Don't show the welcome tab
          '--skip-welcome',
          '--skip-release-notes',
        ],
      });
    } finally {
      if (originalHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = originalHome;
      }
      maybeCleanupScenarioArtifacts(
        workspacePath,
        hadGitignore,
        scenario.preserveWorkspaceCodegraphy === true,
      );
      fs.rmSync(vscodeProfilePath, { recursive: true, force: true });
    }
  }
}

main().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
