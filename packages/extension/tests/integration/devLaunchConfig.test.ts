import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

interface LaunchConfiguration {
  name?: string;
  type?: string;
  request?: string;
  args?: string[];
}

interface LaunchFile {
  configurations?: LaunchConfiguration[];
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
});
