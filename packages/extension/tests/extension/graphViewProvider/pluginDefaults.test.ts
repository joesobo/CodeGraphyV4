import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IGroup } from '../../../src/shared/settings/groups';
import { createGraphViewProviderTestHarness } from './testHarness';
import { getGraphViewProviderInternals } from './internals';
import { createTypeScriptPlugin } from '../../../../plugin-typescript/src/plugin';
import { createPythonPlugin } from '../../../../plugin-python/src/plugin';

type GroupSummary = Pick<IGroup, 'id'> & Partial<Pick<IGroup, 'pattern' | 'color' | 'disabled' | 'isPluginDefault' | 'pluginName'>>;

interface PluginDefaultsProvider {
  _analyzer: {
    initialize(): Promise<void>;
    registry: {
      register(plugin: unknown): void;
    };
  };
  _disabledPlugins: Set<string>;
  _groups: IGroup[];
  _hiddenPluginGroupIds: Set<string>;
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

  it('returns plugin default groups with isPluginDefault flag', async () => {
    const provider = getProvider(harness);
    const internals = getGraphViewProviderInternals(harness.provider);
    provider._userGroups = [];
    await provider._analyzer.initialize();
    registerOptionalPlugins(provider);

    const pluginGroups = internals._pluginResourceMethods._getPluginDefaultGroups() as GroupSummary[];
    expect(pluginGroups.length).toBeGreaterThan(0);
    expect(pluginGroups.some(g => g.id === 'plugin:codegraphy.typescript:*.ts' && g.color === '#3178C6')).toBe(true);
    expect(pluginGroups.some(g => g.id === 'plugin:codegraphy.python:*.py' && g.color === '#3776AB')).toBe(true);
    expect(pluginGroups.every(g => g.isPluginDefault === true)).toBe(true);
  });

  it('computeMergedGroups combines user groups with visible plugin defaults', async () => {
    const provider = getProvider(harness);
    const internals = getGraphViewProviderInternals(harness.provider);
    provider._userGroups = [{ id: 'user-group-1', pattern: 'src/**', color: '#FF0000' }] as IGroup[];
    provider._hiddenPluginGroupIds = new Set<string>();
    await provider._analyzer.initialize();
    registerOptionalPlugins(provider);

    internals._pluginResourceMethods._computeMergedGroups();

    const groups = provider._groups as GroupSummary[];
    expect(groups.some(g => g.id === 'user-group-1')).toBe(true);
    expect(groups.some(g => g.id === 'plugin:codegraphy.typescript:*.ts')).toBe(true);
    expect(groups.some(g => g.id === 'plugin:codegraphy.typescript:.ts')).toBe(false);
  });

  it('computeMergedGroups marks disabled plugin groups but keeps them in list', async () => {
    const provider = getProvider(harness);
    const internals = getGraphViewProviderInternals(harness.provider);
    provider._userGroups = [];
    provider._hiddenPluginGroupIds = new Set(['plugin:codegraphy.typescript:*.ts']);
    await provider._analyzer.initialize();
    registerOptionalPlugins(provider);

    internals._pluginResourceMethods._computeMergedGroups();

    const groups = provider._groups as GroupSummary[];
    const tsGroup = groups.find(g => g.id === 'plugin:codegraphy.typescript:*.ts');
    expect(tsGroup).toBeDefined();
    expect(tsGroup!.disabled).toBe(true);
    const pyGroup = groups.find(g => g.id === 'plugin:codegraphy.python:*.py');
    expect(pyGroup).toBeDefined();
    expect(pyGroup!.disabled).toBeUndefined();
  });

  it('computeMergedGroups includes built-in default groups', async () => {
    const provider = getProvider(harness);
    const internals = getGraphViewProviderInternals(harness.provider);
    provider._userGroups = [];
    provider._hiddenPluginGroupIds = new Set<string>();
    await provider._analyzer.initialize();

    internals._pluginResourceMethods._computeMergedGroups();

    const groups = provider._groups as GroupSummary[];
    const jsonGroup = groups.find(g => g.id === 'default:*.json');
    expect(jsonGroup).toBeDefined();
    expect(jsonGroup!.pluginName).toBe('CodeGraphy');
    expect(jsonGroup!.isPluginDefault).toBe(true);
    expect(groups.some(g => g.id === 'default:.gitignore')).toBe(true);
    expect(groups.some(g => g.id === 'default:*.png')).toBe(true);
    expect(groups.some(g => g.id === 'default:*.jpg')).toBe(true);
    expect(groups.some(g => g.id === 'default:*.md')).toBe(true);
    expect(groups.some(g => g.id === 'default:.codegraphy/settings.json')).toBe(true);
  });

  it('computeMergedGroups marks built-in defaults as disabled when section is disabled', async () => {
    const provider = getProvider(harness);
    const internals = getGraphViewProviderInternals(harness.provider);
    provider._userGroups = [];
    provider._hiddenPluginGroupIds = new Set(['default']);
    await provider._analyzer.initialize();

    internals._pluginResourceMethods._computeMergedGroups();

    const groups = provider._groups as GroupSummary[];
    const builtInGroups = groups.filter(g => g.id.startsWith('default:'));
    expect(builtInGroups.length).toBeGreaterThan(0);
    for (const g of builtInGroups) {
      expect(g.disabled).toBe(true);
    }
  });

  it('getPluginDefaultGroups excludes disabled plugins', async () => {
    const provider = getProvider(harness);
    const internals = getGraphViewProviderInternals(harness.provider);
    provider._disabledPlugins = new Set(['codegraphy.typescript']);
    await provider._analyzer.initialize();
    registerOptionalPlugins(provider);

    const pluginGroups = internals._pluginResourceMethods._getPluginDefaultGroups() as GroupSummary[];
    expect(pluginGroups.some(g => g.id.startsWith('plugin:codegraphy.typescript:'))).toBe(false);
    expect(pluginGroups.some(g => g.id.startsWith('plugin:codegraphy.python:'))).toBe(true);

    provider._disabledPlugins = new Set<string>();
  });

  it('disables a plugin group when TOGGLE_PLUGIN_GROUP_DISABLED is received', async () => {
    const { getMessageHandler } = harness.createResolvedWebview();
    const provider = getProvider(harness);
    provider._userGroups = [];
    provider._hiddenPluginGroupIds = new Set<string>();
    await provider._analyzer.initialize();
    registerOptionalPlugins(provider);

    const handler = getMessageHandler();
    await handler({ type: 'TOGGLE_PLUGIN_GROUP_DISABLED', payload: { groupId: 'plugin:codegraphy.typescript:*.ts', disabled: true } });

    expect(provider._hiddenPluginGroupIds.has('plugin:codegraphy.typescript:*.ts')).toBe(true);
    const groups = provider._groups as GroupSummary[];
    const tsGroup = groups.find(g => g.id === 'plugin:codegraphy.typescript:*.ts');
    expect(tsGroup).toBeDefined();
    expect(tsGroup!.disabled).toBe(true);
  });

  it('re-enables a plugin group when TOGGLE_PLUGIN_GROUP_DISABLED is received with disabled=false', async () => {
    const { getMessageHandler } = harness.createResolvedWebview();
    const provider = getProvider(harness);
    provider._userGroups = [];
    provider._hiddenPluginGroupIds = new Set(['plugin:codegraphy.typescript:*.ts']);
    await provider._analyzer.initialize();
    registerOptionalPlugins(provider);

    const handler = getMessageHandler();
    await handler({ type: 'TOGGLE_PLUGIN_GROUP_DISABLED', payload: { groupId: 'plugin:codegraphy.typescript:*.ts', disabled: false } });

    expect(provider._hiddenPluginGroupIds.has('plugin:codegraphy.typescript:*.ts')).toBe(false);
    const groups = provider._groups as GroupSummary[];
    const tsGroup = groups.find(g => g.id === 'plugin:codegraphy.typescript:*.ts');
    expect(tsGroup).toBeDefined();
    expect(tsGroup!.disabled).toBeUndefined();
  });

  it('disables all groups in a plugin section with a single section-level entry', async () => {
    const { getMessageHandler } = harness.createResolvedWebview();
    const provider = getProvider(harness);
    provider._userGroups = [];
    provider._hiddenPluginGroupIds = new Set<string>();
    await provider._analyzer.initialize();
    registerOptionalPlugins(provider);

    const handler = getMessageHandler();
    await handler({ type: 'TOGGLE_PLUGIN_SECTION_DISABLED', payload: { pluginId: 'codegraphy.typescript', disabled: true } });

    expect(provider._hiddenPluginGroupIds.has('plugin:codegraphy.typescript')).toBe(true);
    expect(provider._hiddenPluginGroupIds.size).toBe(1);

    const groups = provider._groups as GroupSummary[];
    const tsGroups = groups.filter(g => g.id.startsWith('plugin:codegraphy.typescript:'));
    expect(tsGroups.length).toBeGreaterThan(0);
    for (const g of tsGroups) {
      expect(g.disabled).toBe(true);
    }
    const pyGroup = groups.find(g => g.id === 'plugin:codegraphy.python:*.py');
    expect(pyGroup?.disabled).toBeUndefined();
  });

  it('re-enabling a section also clears individual group entries under it', async () => {
    const { getMessageHandler } = harness.createResolvedWebview();
    const provider = getProvider(harness);
    provider._userGroups = [];
    provider._hiddenPluginGroupIds = new Set(['plugin:codegraphy.typescript', 'plugin:codegraphy.typescript:*.ts']);
    await provider._analyzer.initialize();
    registerOptionalPlugins(provider);

    const handler = getMessageHandler();
    await handler({ type: 'TOGGLE_PLUGIN_SECTION_DISABLED', payload: { pluginId: 'codegraphy.typescript', disabled: false } });

    expect(provider._hiddenPluginGroupIds.size).toBe(0);
    const groups = provider._groups as GroupSummary[];
    const tsGroup = groups.find(g => g.id === 'plugin:codegraphy.typescript:*.ts');
    expect(tsGroup?.disabled).toBeUndefined();
  });
});
