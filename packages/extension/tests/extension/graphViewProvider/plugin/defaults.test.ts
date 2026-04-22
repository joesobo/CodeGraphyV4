import * as path from 'node:path';
import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IGroup } from '../../../../src/shared/settings/groups';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import { createGraphViewProviderTestHarness } from '../testHarness';
import { getGraphViewProviderInternals } from '../internals';
import { createTypeScriptPlugin } from '../../../../../plugin-typescript/src/plugin';
import { createPythonPlugin } from '../../../../../plugin-python/src/plugin';

type GroupSummary = Pick<IGroup, 'id'> & Partial<Pick<IGroup, 'pattern' | 'color' | 'disabled' | 'isPluginDefault' | 'pluginName'>>;

interface PluginDefaultsProvider {
  _analyzer: {
    initialize(): Promise<void>;
    registry: {
      register(plugin: unknown): void;
    };
  };
  _disabledPlugins: Set<string>;
  _graphData: IGraphData;
  _groups: IGroup[];
  _userGroups: IGroup[];
}

function getProvider(harness: { provider: unknown }) {
  return harness.provider as unknown as PluginDefaultsProvider;
}

function registerOptionalPlugins(provider: PluginDefaultsProvider): void {
  provider._analyzer.registry.register(createTypeScriptPlugin());
  provider._analyzer.registry.register(createPythonPlugin());
}

describe('GraphViewProvider plugin defaults and toggles', () => {
  let harness = createGraphViewProviderTestHarness();

  beforeEach(() => {
    vi.clearAllMocks();
    harness = createGraphViewProviderTestHarness();
  });

  it('returns no optional plugin file-theme defaults when core Material theming owns those files', async () => {
    const provider = getProvider(harness);
    const internals = getGraphViewProviderInternals(harness.provider);
    provider._userGroups = [];
    await provider._analyzer.initialize();
    registerOptionalPlugins(provider);

    const pluginGroups = internals._pluginResourceMethods._getPluginDefaultGroups() as GroupSummary[];
    expect(pluginGroups).toEqual([]);
  });

  it('computeMergedGroups keeps user groups when optional plugins no longer contribute file-theme defaults', async () => {
    const provider = getProvider(harness);
    const internals = getGraphViewProviderInternals(harness.provider);
    provider._userGroups = [{ id: 'user-group-1', pattern: 'src/**', color: '#FF0000' }] as IGroup[];
    await provider._analyzer.initialize();
    registerOptionalPlugins(provider);

    internals._pluginResourceMethods._computeMergedGroups();

    const groups = provider._groups as GroupSummary[];
    expect(groups.some(g => g.id === 'user-group-1')).toBe(true);
    expect(groups.some(g => g.id.startsWith('plugin:codegraphy.typescript:'))).toBe(false);
    expect(groups.some(g => g.id.startsWith('plugin:codegraphy.python:'))).toBe(false);
  });

  it('computeMergedGroups includes built-in default groups', async () => {
    harness.mockContext.extensionUri = vscode.Uri.file(path.resolve(process.cwd(), '../..'));
    harness.recreateProvider();
    const provider = getProvider(harness);
    const internals = getGraphViewProviderInternals(harness.provider);
    provider._userGroups = [];
    provider._graphData = {
      nodes: [
        { id: 'package.json', label: 'package.json', color: '#000000' },
        { id: 'README.md', label: 'README.md', color: '#000000' },
      ],
      edges: [],
    };
    await provider._analyzer.initialize();

    internals._pluginResourceMethods._computeMergedGroups();

    const groups = provider._groups as GroupSummary[];
    const jsonGroup = groups.find(g => g.id === 'default:fileName:package.json');
    expect(jsonGroup).toBeDefined();
    expect(jsonGroup!.pluginName).toBe('Material Icon Theme');
    expect(jsonGroup!.isPluginDefault).toBe(true);
    expect(groups.some(g => g.id === 'default:fileName:README.md')).toBe(true);
    expect(groups.some(g => g.id === 'default:fileName:.codegraphy/settings.json')).toBe(true);
  });

  it('getPluginDefaultGroups stays empty even when optional plugins are disabled', async () => {
    const provider = getProvider(harness);
    const internals = getGraphViewProviderInternals(harness.provider);
    provider._disabledPlugins = new Set(['codegraphy.typescript']);
    await provider._analyzer.initialize();
    registerOptionalPlugins(provider);

    const pluginGroups = internals._pluginResourceMethods._getPluginDefaultGroups() as GroupSummary[];
    expect(pluginGroups).toEqual([]);

    provider._disabledPlugins = new Set<string>();
  });

});
