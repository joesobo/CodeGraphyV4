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
import {
  parseCodeGraphyPluginPackageManifest,
  readCodeGraphyWorkspaceSettingsOrInitial,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
  type CodeGraphyInstalledPluginRecord,
  type CodeGraphyWorkspacePluginSettings,
} from '@codegraphy/core';
import { e2eScenarios, type E2EScenario } from './scenarios';

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

function readScenarioPackageRecord(packageRoot: string): CodeGraphyInstalledPluginRecord {
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as unknown;
  const manifest = parseCodeGraphyPluginPackageManifest(packageJson);
  if (!manifest) {
    throw new Error(`E2E scenario package is not a CodeGraphy plugin: ${packageRoot}`);
  }

  return {
    ...manifest,
    packageRoot,
  };
}

function createWorkspacePluginSettings(
  plugin: CodeGraphyInstalledPluginRecord,
): CodeGraphyWorkspacePluginSettings {
  const settings: CodeGraphyWorkspacePluginSettings = { package: plugin.package };
  if (plugin.defaultOptions && Object.keys(plugin.defaultOptions).length > 0) {
    settings.options = { ...plugin.defaultOptions };
  }

  return settings;
}

function prepareScenarioWorkspacePlugins(
  scenario: E2EScenario,
  repoRoot: string,
  workspacePath: string,
  homeDir: string,
): void {
  const plugins = scenario.workspacePluginPackageRelativePaths
    .map(relativePath => readScenarioPackageRecord(path.resolve(repoRoot, relativePath)));

  writeCodeGraphyInstalledPluginCache({ version: 1, plugins }, { homeDir });

  if (plugins.length === 0) {
    return;
  }

  const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspacePath);
  const enabledPackages = new Set(settings.plugins.map(plugin => plugin.package));
  writeCodeGraphyWorkspaceSettings(workspacePath, {
    ...settings,
    plugins: [
      ...settings.plugins,
      ...plugins
        .filter(plugin => !enabledPackages.has(plugin.package))
        .map(createWorkspacePluginSettings),
    ],
  });
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
    prepareScenarioWorkspacePlugins(scenario, repoRoot, workspacePath, homeDir);

    try {
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
      cleanupScenarioArtifacts(workspacePath, hadGitignore);
      fs.rmSync(vscodeProfilePath, { recursive: true, force: true });
    }
  }
}

main().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
