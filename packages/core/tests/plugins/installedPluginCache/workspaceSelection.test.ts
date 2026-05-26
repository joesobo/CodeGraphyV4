import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  disableCodeGraphyWorkspacePlugin,
  enableCodeGraphyWorkspacePlugin,
} from '../../../src/plugins/installedPluginCache/workspaceSelection';
import { readCodeGraphyWorkspaceSettings, writeCodeGraphyWorkspaceSettings } from '../../../src/workspace/settings';

describe('plugins/installedPluginCache/workspaceSelection', () => {
  it('adds a plugin with copied default options to workspace settings', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));

    enableCodeGraphyWorkspacePlugin(workspaceRoot, {
      package: '@codegraphy-dev/plugin-python',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      defaultOptions: { includeTests: true },
      disclosures: [],
      packageRoot: '/global/@codegraphy-dev/plugin-python',
    });

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([
      { package: '@codegraphy-dev/plugin-markdown' },
      {
        package: '@codegraphy-dev/plugin-python',
        options: { includeTests: true },
      },
    ]);
  });

  it('merges default options behind existing options for an enabled plugin', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        package: '@codegraphy-dev/plugin-python',
        options: { includeTests: false },
      }],
    });

    enableCodeGraphyWorkspacePlugin(workspaceRoot, {
      package: '@codegraphy-dev/plugin-python',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      defaultOptions: { includeTests: true, pythonVersion: '3.12' },
      disclosures: [],
      packageRoot: '/global/@codegraphy-dev/plugin-python',
    });

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([{
      package: '@codegraphy-dev/plugin-python',
      options: { includeTests: false, pythonVersion: '3.12' },
    }]);
  });

  it('omits empty option objects and removes disabled packages', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));

    enableCodeGraphyWorkspacePlugin(workspaceRoot, {
      package: '@codegraphy-dev/plugin-ruby',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      disclosures: [],
      packageRoot: '/global/@codegraphy-dev/plugin-ruby',
    });

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toContainEqual({
      package: '@codegraphy-dev/plugin-ruby',
    });

    disableCodeGraphyWorkspacePlugin(workspaceRoot, '@codegraphy-dev/plugin-ruby');

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).not.toContainEqual({
      package: '@codegraphy-dev/plugin-ruby',
    });
  });

  it('does not add empty options when re-enabling a plugin without defaults', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{ package: '@codegraphy-dev/plugin-ruby' }],
    });

    enableCodeGraphyWorkspacePlugin(workspaceRoot, {
      package: '@codegraphy-dev/plugin-ruby',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      disclosures: [],
      packageRoot: '/global/@codegraphy-dev/plugin-ruby',
    });

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([{
      package: '@codegraphy-dev/plugin-ruby',
    }]);
  });

  it('keeps unrelated workspace plugins when disabling one package', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [
        { package: '@codegraphy-dev/plugin-python' },
        { package: '@codegraphy-dev/plugin-ruby' },
      ],
    });

    disableCodeGraphyWorkspacePlugin(workspaceRoot, '@codegraphy-dev/plugin-python');

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([
      { package: '@codegraphy-dev/plugin-ruby' },
    ]);
  });
});
