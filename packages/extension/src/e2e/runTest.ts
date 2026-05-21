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
import { e2eScenarios, type E2EScenario } from './scenarios';
import type { runTests as runVSCodeTests } from '@vscode/test-electron';

interface CodeGraphyInstalledPluginRecord {
  package: string;
  version: string;
  apiVersion: string;
  packageRoot: string;
  defaultOptions?: Record<string, unknown>;
  disclosures: string[];
}

interface CodeGraphyWorkspacePluginSettings {
  package: string;
  options?: Record<string, unknown>;
}

interface E2EWorkspaceSettings {
  version: 1;
  maxFiles: number;
  include: string[];
  respectGitignore: boolean;
  showOrphans: boolean;
  filterPatterns: string[];
  disabledCustomFilterPatterns: string[];
  plugins: CodeGraphyWorkspacePluginSettings[];
}

const CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME = '@codegraphy-dev/plugin-markdown';
const DEFAULT_MAX_FILES = 1000;
const DEFAULT_INCLUDE = ['**/*'];

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function readScenarioPackageRecord(packageRoot: string): CodeGraphyInstalledPluginRecord {
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as unknown;
  if (!isRecord(packageJson) || !isRecord(packageJson.codegraphy)) {
    throw new Error(`E2E scenario package is not a CodeGraphy plugin: ${packageRoot}`);
  }

  const packageName = typeof packageJson.name === 'string' ? packageJson.name : '';
  const version = typeof packageJson.version === 'string' ? packageJson.version : '';
  const apiVersion = typeof packageJson.codegraphy.apiVersion === 'string'
    ? packageJson.codegraphy.apiVersion
    : '';
  if (
    packageName.length === 0
    || version.length === 0
    || packageJson.codegraphy.type !== 'plugin'
    || apiVersion.length === 0
  ) {
    throw new Error(`E2E scenario package is not a CodeGraphy plugin: ${packageRoot}`);
  }

  const plugin: CodeGraphyInstalledPluginRecord = {
    package: packageName,
    version,
    apiVersion,
    packageRoot,
    disclosures: readStringArray(packageJson.codegraphy.disclosures),
  };
  if (isRecord(packageJson.codegraphy.defaultOptions)) {
    plugin.defaultOptions = { ...packageJson.codegraphy.defaultOptions };
  }

  return plugin;
}

function createInitialWorkspaceSettings(
  plugins: readonly CodeGraphyInstalledPluginRecord[],
): E2EWorkspaceSettings {
  return {
    version: 1,
    maxFiles: DEFAULT_MAX_FILES,
    include: DEFAULT_INCLUDE,
    respectGitignore: true,
    showOrphans: true,
    filterPatterns: [],
    disabledCustomFilterPatterns: [],
    plugins: [
      { package: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME },
      ...plugins.map(createWorkspacePluginSettings),
    ],
  };
}

function writeInstalledPluginCache(
  homeDir: string,
  plugins: CodeGraphyInstalledPluginRecord[],
): void {
  const userDirectoryPath = path.join(homeDir, '.codegraphy');
  fs.mkdirSync(userDirectoryPath, { recursive: true });
  fs.writeFileSync(
    path.join(userDirectoryPath, 'plugins.json'),
    `${JSON.stringify({ version: 1, plugins }, null, 2)}\n`,
  );
}

function readWorkspaceSettingsOrInitial(workspacePath: string): E2EWorkspaceSettings {
  const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');
  if (!fs.existsSync(settingsPath)) {
    return createInitialWorkspaceSettings([]);
  }

  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as unknown;
  if (!isRecord(settings) || !Array.isArray(settings.plugins)) {
    return createInitialWorkspaceSettings([]);
  }

  const include = readStringArray(settings.include);
  return {
    version: 1,
    maxFiles: typeof settings.maxFiles === 'number' ? settings.maxFiles : DEFAULT_MAX_FILES,
    include: include.length > 0 ? include : DEFAULT_INCLUDE,
    respectGitignore: typeof settings.respectGitignore === 'boolean' ? settings.respectGitignore : true,
    showOrphans: typeof settings.showOrphans === 'boolean' ? settings.showOrphans : true,
    filterPatterns: readStringArray(settings.filterPatterns),
    disabledCustomFilterPatterns: readStringArray(settings.disabledCustomFilterPatterns),
    plugins: settings.plugins
      .filter(isRecord)
      .map((plugin): CodeGraphyWorkspacePluginSettings | null => {
        const packageName = typeof plugin.package === 'string' ? plugin.package.trim() : '';
        if (packageName.length === 0) {
          return null;
        }

        const normalized: CodeGraphyWorkspacePluginSettings = { package: packageName };
        if (isRecord(plugin.options)) {
          normalized.options = { ...plugin.options };
        }
        return normalized;
      })
      .filter((plugin): plugin is CodeGraphyWorkspacePluginSettings => plugin !== null),
  };
}

function writeWorkspaceSettings(workspacePath: string, settings: E2EWorkspaceSettings): void {
  const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
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

  writeInstalledPluginCache(homeDir, plugins);

  if (plugins.length === 0) {
    return;
  }

  const settings = readWorkspaceSettingsOrInitial(workspacePath);
  const enabledPackages = new Set(settings.plugins.map(plugin => plugin.package));
  writeWorkspaceSettings(workspacePath, {
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

    try {
      cleanupScenarioArtifacts(workspacePath, hadGitignore);
      prepareScenarioWorkspacePlugins(scenario, repoRoot, workspacePath, homeDir);
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
      cleanupScenarioArtifacts(workspacePath, hadGitignore);
      fs.rmSync(vscodeProfilePath, { recursive: true, force: true });
    }
  }
}

main().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
