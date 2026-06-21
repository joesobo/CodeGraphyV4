import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

interface LaunchConfiguration {
  name?: string;
  type?: string;
  request?: string;
  args?: string[];
  preLaunchTask?: string;
}

interface LaunchFile {
  configurations?: LaunchConfiguration[];
}

interface TaskConfiguration {
  label?: string;
  type?: string;
  script?: string;
}

interface TasksFile {
  tasks?: TaskConfiguration[];
}

interface RootPackageManifest {
  scripts?: Record<string, string>;
}

function readRootPackageManifest(): RootPackageManifest {
  const packageJsonPath = path.resolve(__dirname, '../../../../package.json');
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as RootPackageManifest;
}

function readLaunchConfig(): LaunchConfiguration {
  const launchPath = path.resolve(__dirname, '../../../../.vscode/launch.json');
  const launchFile = JSON.parse(fs.readFileSync(launchPath, 'utf8')) as LaunchFile;
  const configuration = launchFile.configurations?.find(
    (entry) => entry.name === 'Run Extension',
  );

  expect(configuration).toBeDefined();
  return configuration!;
}

function readTaskConfig(label: string): TaskConfiguration {
  const tasksPath = path.resolve(__dirname, '../../../../.vscode/tasks.json');
  const tasksFile = JSON.parse(fs.readFileSync(tasksPath, 'utf8')) as TasksFile;
  const task = tasksFile.tasks?.find((entry) => entry.label === label);

  expect(task).toBeDefined();
  return task!;
}

describe('dev launch config', () => {
  it('loads only the core VS Code extension in the extension host', () => {
    const configuration = readLaunchConfig();

    expect(configuration.type).toBe('extensionHost');
    expect(configuration.request).toBe('launch');
    expect(
      configuration.args?.filter(arg => arg.startsWith('--extensionDevelopmentPath=')),
    ).toEqual(['--extensionDevelopmentPath=${workspaceFolder}']);
  });

  it('uses a dedicated prelaunch build that materializes extension and plugin outputs in the active worktree', () => {
    const configuration = readLaunchConfig();
    const task = readTaskConfig('npm: build:devhost');
    const packageManifest = readRootPackageManifest();

    expect(configuration.preLaunchTask).toBe('npm: build:devhost');
    expect(task.type).toBe('npm');
    expect(task.script).toBe('build:devhost');
    expect(packageManifest.scripts?.['build:devhost']).toBe('node scripts/build-devhost.mjs');
  });

  it('prepares the devhost by building the extension and linking local plugin packages', () => {
    const repoRoot = path.resolve(__dirname, '../../../..');
    const privatePackageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-organize-devhost-'));
    fs.writeFileSync(
      path.join(privatePackageRoot, 'package.json'),
      JSON.stringify({
        name: '@codegraphy-pro/organize',
        version: '0.1.0',
        codegraphy: { type: 'plugin', apiVersion: '^2.0.0' },
      }),
    );

    const output = execFileSync(
      process.execPath,
      [path.join(repoRoot, 'scripts/build-devhost.mjs'), '--dry-run', '--json'],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          CODEGRAPHY_ORGANIZE_PLUGIN_ROOT: privatePackageRoot,
        },
      },
    );
    const plan = JSON.parse(output) as {
      buildFilters: string[];
      linkPackageRoots: string[];
      privatePluginBuildRoots: string[];
    };

    expect(plan.buildFilters).toEqual(expect.arrayContaining([
      '@codegraphy-dev/extension...',
      '@codegraphy-dev/plugin-typescript...',
      '@codegraphy-dev/plugin-godot...',
    ]));
    expect(plan.linkPackageRoots).toEqual(expect.arrayContaining([
      path.join(repoRoot, 'packages/plugin-typescript'),
      path.join(repoRoot, 'packages/plugin-godot'),
      privatePackageRoot,
    ]));
    expect(plan.privatePluginBuildRoots).toContain(privatePackageRoot);
  });
});
