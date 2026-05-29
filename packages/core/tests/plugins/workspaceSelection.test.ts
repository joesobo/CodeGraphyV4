import { describe, expect, it } from 'vitest';
import {
  updateCodeGraphyWorkspacePluginSelection,
  type CodeGraphyWorkspacePluginSettings,
} from '../../src';

describe('plugins/workspaceSelection', () => {
  it('removes disabled package plugins from workspace settings', () => {
    const plugins: CodeGraphyWorkspacePluginSettings[] = [
      { package: '@codegraphy-dev/plugin-markdown' },
      { package: '@codegraphy-dev/plugin-python', options: { includeTests: true } },
    ];

    expect(
      updateCodeGraphyWorkspacePluginSelection(plugins, {
        packageName: '@codegraphy-dev/plugin-python',
        enabled: false,
      }),
    ).toEqual([
      { package: '@codegraphy-dev/plugin-markdown' },
    ]);
  });

  it('adds enabled package plugins with default options', () => {
    const plugins: CodeGraphyWorkspacePluginSettings[] = [
      { package: '@codegraphy-dev/plugin-markdown' },
    ];

    expect(
      updateCodeGraphyWorkspacePluginSelection(plugins, {
        packageName: '@codegraphy-dev/plugin-godot',
        enabled: true,
        defaultOptions: {
          includeAutoloads: true,
          includeSceneResources: true,
        },
      }),
    ).toEqual([
      { package: '@codegraphy-dev/plugin-markdown' },
      {
        package: '@codegraphy-dev/plugin-godot',
        options: {
          includeAutoloads: true,
          includeSceneResources: true,
        },
      },
    ]);
  });

  it('keeps existing enabled package plugin entries unchanged', () => {
    const plugins: CodeGraphyWorkspacePluginSettings[] = [
      { package: '@codegraphy-dev/plugin-python', options: { includeTests: true } },
    ];

    expect(
      updateCodeGraphyWorkspacePluginSelection(plugins, {
        packageName: '@codegraphy-dev/plugin-python',
        enabled: true,
        defaultOptions: { includeTests: false },
      }),
    ).toEqual([
      { package: '@codegraphy-dev/plugin-python', options: { includeTests: true } },
    ]);
  });
});
