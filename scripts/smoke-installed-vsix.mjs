import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFromExtension = createRequire(
  path.join(repoRoot, 'packages', 'extension', 'package.json'),
);
const { runTests, runVSCodeCommand } = requireFromExtension('@vscode/test-electron');

const hostTargetByPlatform = {
  linux: {
    x64: 'linux-x64',
  },
  darwin: {
    arm64: 'darwin-arm64',
  },
  win32: {
    x64: 'win32-x64',
  },
};

function readExtensionVersion() {
  const manifestPath = path.join(repoRoot, 'packages', 'extension', 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  return manifest.version;
}

function parseRequestedTargets(value) {
  if (!value) {
    return [hostTargetByPlatform[process.platform]?.[process.arch]].filter(Boolean);
  }

  return value
    .split(',')
    .map(target => target.trim())
    .filter(Boolean);
}

function findVsixForTarget({ artifactsDir, version, target }) {
  const expectedName = `codegraphy.codegraphy-${version}-${target}.vsix`;
  const expectedPath = path.join(artifactsDir, expectedName);

  if (existsSync(expectedPath)) {
    return expectedPath;
  }

  return readdirSync(artifactsDir)
    .filter(fileName => fileName.endsWith(`-${target}.vsix`))
    .map(fileName => path.join(artifactsDir, fileName))
    .at(0);
}

async function smokeInstalledVsix({ target, vsixPath }) {
  const profilePath = mkdtempSync(path.join(tmpdir(), 'cg-vsix-'));
  const harnessPath = path.join(profilePath, 'harness');
  const userDataDir = path.join(profilePath, 'user-data');
  const extensionsDir = path.join(profilePath, 'extensions');
  const workspacePath = path.join(repoRoot, 'examples', 'example-typescript');
  const extensionTestsPath = path.join(
    repoRoot,
    'packages',
    'extension',
    'dist-e2e',
    'extension',
    'src',
    'e2e',
    'suite',
    'run',
  );
  const profileArgs = [
    `--user-data-dir=${userDataDir}`,
    `--extensions-dir=${extensionsDir}`,
  ];
  const pluginCacheHomeDir = homedir();
  const restoreInstalledPluginCache = snapshotInstalledPluginCache(pluginCacheHomeDir);

  try {
    const { e2eScenarios, prepareScenarioWorkspacePlugins } = await loadE2ESmokeSetup();
    const scenario = e2eScenarios.find(entry => entry.name === 'typescript');
    if (!scenario) {
      throw new Error('Missing TypeScript E2E smoke scenario.');
    }

    buildScenarioWorkspacePluginPackages(scenario);
    prepareScenarioWorkspacePlugins(scenario, repoRoot, workspacePath, pluginCacheHomeDir, false);

    await writeHarnessExtension(harnessPath);
    await runVSCodeCommand([
      ...profileArgs,
      '--install-extension',
      vsixPath,
      '--force',
    ]);

    await runTests({
      extensionDevelopmentPath: harnessPath,
      extensionTestsPath,
      extensionTestsEnv: {
        CODEGRAPHY_E2E_SCENARIO: 'typescript',
        CODEGRAPHY_E2E_GREP: 'extension activates without error|all commands are registered|manual graph indexing creates scenario edges',
      },
      launchArgs: [
        workspacePath,
        ...profileArgs,
        '--use-inmemory-secretstorage',
        '--sync',
        'off',
        '--disable-telemetry',
        '--disable-updates',
        '--disable-workspace-trust',
        '--skip-welcome',
        '--skip-release-notes',
      ],
    });

    console.log(`${path.basename(vsixPath)} installed and activated in VS Code on ${target}`);
  } finally {
    restoreInstalledPluginCache();
    rmSync(profilePath, { recursive: true, force: true });
  }
}

function buildScenarioWorkspacePluginPackages(scenario) {
  for (const relativePath of scenario.workspacePluginPackageRelativePaths) {
    const packageRoot = path.resolve(repoRoot, relativePath);
    const packageJson = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
    if (!packageJson.scripts?.build) {
      continue;
    }

    const result = spawnSync(
      'pnpm',
      ['--dir', packageRoot, 'run', 'build'],
      {
        cwd: repoRoot,
        stdio: 'inherit',
        shell: process.platform === 'win32',
      },
    );
    if (result.status !== 0) {
      throw new Error(`Unable to build workspace plugin package at ${relativePath}.`);
    }
  }
}

function snapshotInstalledPluginCache(homeDir) {
  const userDirectoryPath = path.join(homeDir, '.codegraphy');
  const cachePath = path.join(userDirectoryPath, 'plugins.json');
  const hadUserDirectory = existsSync(userDirectoryPath);
  const hadCache = existsSync(cachePath);
  const backupDirectoryPath = mkdtempSync(path.join(tmpdir(), 'cg-vsix-plugin-cache-'));
  const backupPath = path.join(backupDirectoryPath, 'plugins.json');

  if (hadCache) {
    copyFileSync(cachePath, backupPath);
  }

  return () => {
    try {
      if (hadCache) {
        mkdirSync(userDirectoryPath, { recursive: true });
        copyFileSync(backupPath, cachePath);
      } else {
        rmSync(cachePath, { force: true });
      }

      if (!hadUserDirectory && existsSync(userDirectoryPath) && readdirSync(userDirectoryPath).length === 0) {
        rmSync(userDirectoryPath, { recursive: true, force: true });
      }
    } finally {
      rmSync(backupDirectoryPath, { recursive: true, force: true });
    }
  };
}

async function loadE2ESmokeSetup() {
  const scenariosModule = await import(pathToFileURL(path.join(
    repoRoot,
    'packages',
    'extension',
    'dist-e2e',
    'extension',
    'src',
    'e2e',
    'scenarios.js',
  )).href);
  const workspacePluginsModule = await import(pathToFileURL(path.join(
    repoRoot,
    'packages',
    'extension',
    'dist-e2e',
    'extension',
    'src',
    'e2e',
    'workspacePlugins.js',
  )).href);

  return {
    e2eScenarios: scenariosModule.e2eScenarios,
    prepareScenarioWorkspacePlugins: workspacePluginsModule.prepareScenarioWorkspacePlugins,
  };
}

async function writeHarnessExtension(harnessPath) {
  const { mkdir, writeFile } = await import('node:fs/promises');

  await mkdir(harnessPath, { recursive: true });
  await writeFile(
    path.join(harnessPath, 'package.json'),
    `${JSON.stringify({
      name: 'codegraphy-vsix-smoke-harness',
      publisher: 'codegraphy',
      version: '0.0.0',
      engines: {
        vscode: '^1.85.0',
      },
      activationEvents: [],
      main: './extension.js',
    }, null, 2)}\n`,
  );
  await writeFile(path.join(harnessPath, 'extension.js'), 'module.exports = {};\n');
}

const artifactsDir = path.join(repoRoot, 'artifacts', 'vsix');
const version = readExtensionVersion();
const targets = parseRequestedTargets(process.env.CODEGRAPHY_VSIX_TARGETS);

if (targets.length === 0) {
  throw new Error(
    `Unsupported VSIX activation smoke host: ${process.platform}-${process.arch}. `
    + 'Set CODEGRAPHY_VSIX_TARGETS to a supported target.',
  );
}

for (const target of targets) {
  const vsixPath = findVsixForTarget({ artifactsDir, version, target });
  if (!vsixPath) {
    throw new Error(`Missing VSIX artifact for ${target} in ${artifactsDir}.`);
  }

  await smokeInstalledVsix({ target, vsixPath });
}
