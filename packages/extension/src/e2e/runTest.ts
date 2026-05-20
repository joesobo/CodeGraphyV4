/**
 * VS Code Extension Test Runner
 *
 * Launches a real VS Code instance with the extension loaded and runs the
 * Mocha test suite against it. Tests have access to the full `vscode` API.
 *
 * Run with: pnpm run test:vscode
 */
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { runTests } from '@vscode/test-electron';
import {
  createInitialCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
  type CodeGraphyInstalledPluginRecord,
} from '@codegraphy/core';
import { e2eScenarios } from './scenarios';

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

interface CodeGraphyPluginPackageJson {
  name?: unknown;
  version?: unknown;
  codegraphy?: {
    apiVersion?: unknown;
    disclosures?: unknown;
  };
}

function readScenarioPluginRecord(
  repoRoot: string,
  packageRelativePath: string,
): CodeGraphyInstalledPluginRecord {
  const packageRoot = path.resolve(repoRoot, packageRelativePath);
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
  ) as CodeGraphyPluginPackageJson;
  const packageName = typeof packageJson.name === 'string' ? packageJson.name : '';
  const version = typeof packageJson.version === 'string' ? packageJson.version : '';
  const apiVersion = typeof packageJson.codegraphy?.apiVersion === 'string'
    ? packageJson.codegraphy.apiVersion
    : '';
  const disclosures = Array.isArray(packageJson.codegraphy?.disclosures)
    ? packageJson.codegraphy.disclosures.filter((entry): entry is CodeGraphyInstalledPluginRecord['disclosures'][number] =>
      entry === 'network'
      || entry === 'secrets'
      || entry === 'externalProcesses'
      || entry === 'workspaceWrites'
      || entry === 'outsideWorkspaceWrites'
      || entry === 'extraFileReads',
    )
    : [];

  if (!packageName || !version || !apiVersion) {
    throw new Error(`Invalid CodeGraphy plugin package fixture at ${packageRoot}`);
  }

  return {
    package: packageName,
    version,
    apiVersion,
    disclosures,
    packageRoot,
  };
}

function writeScenarioPluginState(
  repoRoot: string,
  workspacePath: string,
  homeDir: string,
  packageRelativePaths: readonly string[],
): void {
  const pluginRecords = packageRelativePaths.map(relativePath =>
    readScenarioPluginRecord(repoRoot, relativePath),
  );

  writeCodeGraphyInstalledPluginCache(
    { version: 1, plugins: pluginRecords },
    { homeDir },
  );
  writeCodeGraphyWorkspaceSettings(workspacePath, {
    ...createInitialCodeGraphyWorkspaceSettings(),
    plugins: [
      ...createInitialCodeGraphyWorkspaceSettings().plugins,
      ...pluginRecords.map(plugin => ({ package: plugin.package })),
    ],
  });
}

async function main(): Promise<void> {
  const repoRoot = findRepoRoot(__dirname);
  const extensionTestsPath = path.resolve(
    repoRoot,
    'packages/extension/dist-e2e/extension/src/e2e/suite/run',
    );

  for (const scenario of e2eScenarios) {
    const vscodeProfilePath = fs.mkdtempSync(
      path.join(os.tmpdir(), `codegraphy-e2e-${scenario.name.replace(/[^a-z0-9-]/gi, '-')}-`),
    );
    const homeDir = path.join(vscodeProfilePath, 'home');
    const userDataPath = path.join(vscodeProfilePath, 'u');
    const extensionsPath = path.join(vscodeProfilePath, 'e');
    const workspacePath = path.resolve(repoRoot, scenario.workspaceRelativePath);
    const hadGitignore = fs.existsSync(path.join(workspacePath, '.gitignore'));

    try {
      cleanupScenarioArtifacts(workspacePath, hadGitignore);
      writeScenarioPluginState(
        repoRoot,
        workspacePath,
        homeDir,
        scenario.pluginDevelopmentRelativePaths,
      );
      await runTests({
        extensionDevelopmentPath: repoRoot,
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
      cleanupScenarioArtifacts(workspacePath, hadGitignore);
      fs.rmSync(vscodeProfilePath, { recursive: true, force: true });
    }
  }
}

main().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
