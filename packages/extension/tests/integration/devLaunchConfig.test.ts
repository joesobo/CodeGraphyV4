import * as fs from 'node:fs';
import * as path from 'node:path';
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
  it('loads the core extension and external CodeGraphy plugins in the extension host', () => {
    const configuration = readLaunchConfig();

    expect(configuration.type).toBe('extensionHost');
    expect(configuration.request).toBe('launch');
    expect(configuration.args).toEqual(
      expect.arrayContaining([
        '--extensionDevelopmentPath=${workspaceFolder}',
        '--extensionDevelopmentPath=${workspaceFolder}/packages/plugin-typescript',
        '--extensionDevelopmentPath=${workspaceFolder}/packages/plugin-python',
        '--extensionDevelopmentPath=${workspaceFolder}/packages/plugin-csharp',
        '--extensionDevelopmentPath=${workspaceFolder}/packages/plugin-godot',
      ]),
    );
  });

  it('uses a dedicated prelaunch build that materializes extension and plugin outputs in the active worktree', () => {
    const configuration = readLaunchConfig();
    const task = readTaskConfig('npm: build:devhost');

    expect(configuration.preLaunchTask).toBe('npm: build:devhost');
    expect(task.type).toBe('npm');
    expect(task.script).toBe('build:devhost');
  });
});
