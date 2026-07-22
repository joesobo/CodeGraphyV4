import { describe, expectTypeOf, it } from 'vitest';

import type {
  CodeGraphyAccessKey,
  IAccessProvider,
  IPlugin,
  IPluginGraphScopeCapabilityContext,
  IPluginDataHost,
  IPluginFactory,
  IPluginFactoryOptions,
} from '../src';

describe('plugin API contracts', () => {
  it('lets plugins declare graph scope capabilities separately from emitted graph output', () => {
    const plugin = {
      id: 'acme.routes',
      name: 'Acme Routes',
      version: '0.1.0',
      apiVersion: '^3.0.0',
      supportedExtensions: ['.route'],
      contributeEdgeTypes: () => [{
        id: 'acme.routes:route',
        label: 'Routes',
        defaultColor: '#22C55E',
        defaultVisible: true,
      }],
      contributeGraphScopeCapabilities: (context?: IPluginGraphScopeCapabilityContext) => {
        expectTypeOf(context?.filePaths).toMatchTypeOf<readonly string[] | undefined>();
        return {
          nodeTypes: ['acme.routes:route'],
          edgeTypes: ['import', 'acme.routes:route'],
        };
      },
    } satisfies IPlugin;

    expectTypeOf(plugin.contributeGraphScopeCapabilities).toMatchTypeOf<IPlugin['contributeGraphScopeCapabilities']>();
  });

  it('lets packages register access plumbing', () => {
    const premiumAccess = 'premiumFeature' as CodeGraphyAccessKey;

    const plugin = {
      id: 'acme.account',
      name: 'Acme Account',
      version: '0.1.0',
      apiVersion: '^3.0.0',
      supportedExtensions: [],
      accessProvider: {
        id: 'acme.account.access',
        provides: [premiumAccess],
        async getAccess() {
          return {
            access: premiumAccess,
            state: 'granted',
          };
        },
      } satisfies IAccessProvider,
    } satisfies IPlugin;

    expectTypeOf(plugin.accessProvider).toMatchTypeOf<IAccessProvider>();
  });

  it('keeps interface rendering contracts out of Core plugins', () => {
    expectTypeOf<IPlugin>().not.toHaveProperty('fileColors');
    expectTypeOf<IPlugin>().not.toHaveProperty('graphView');
    expectTypeOf<IPlugin>().not.toHaveProperty('webviewApiVersion');
    expectTypeOf<IPlugin>().not.toHaveProperty('webviewContributions');
    expectTypeOf<IPlugin>().not.toHaveProperty('onLoad');
    expectTypeOf<IPlugin>().not.toHaveProperty('onWebviewReady');
  });

  it('exposes Obsidian-style plugin-owned data persistence', async () => {
    const host = {
      loadData(fallback) {
        return fallback;
      },
      async saveData(_data, _options) {},
    } satisfies IPluginDataHost;

    expectTypeOf(host.loadData({ expanded: true })).toEqualTypeOf<{ expanded: boolean }>();
    await host.saveData({ expanded: false }, { undoLabel: 'Collapse section' });
  });

  it('types package plugin factories that receive workspace host services', () => {
    const factory: IPluginFactory = (options?: IPluginFactoryOptions) => ({
      id: 'acme.graph-tools',
      name: 'Acme Graph Tools',
      version: '0.1.0',
      apiVersion: '^3.0.0',
      supportedExtensions: [],
      async initialize() {
        await options?.dataHost?.saveData({ runtimeNodes: [] });
      },
    });

    expectTypeOf<IPluginFactoryOptions>().toMatchTypeOf<{
      dataHost?: IPluginDataHost;
      options?: Record<string, unknown>;
    }>();
    expectTypeOf(factory).parameter(0).toEqualTypeOf<IPluginFactoryOptions | undefined>();
  });

});
