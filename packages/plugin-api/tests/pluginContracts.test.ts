import { describe, expectTypeOf, it } from 'vitest';

import type {
  CodeGraphyAccessKey,
  IAccessProvider,
  IGraphViewContextMenuContribution,
  IGraphViewForceAdapterContribution,
  IGraphViewProjectionContribution,
  IGraphViewRuntimeNode,
  IGraphViewRuntimeEdgeContribution,
  IGraphViewRuntimeNodeContribution,
  IGraphViewUiSlotContribution,
  IPlugin,
  IPluginGraphScopeCapabilityContext,
  CodeGraphyWebviewAPI,
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

  it('lets packages register access plumbing and contribute account UI without owning feature behavior', () => {
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
      graphView: {
        ui: [{
          id: 'acme.account.toolbar',
          slot: 'graph.toolbar',
          label: 'Account',
          view: { kind: 'command', command: 'acme.account.toggle' },
        } satisfies IGraphViewUiSlotContribution],
      },
    } satisfies IPlugin;

    expectTypeOf(plugin.accessProvider).toMatchTypeOf<IAccessProvider>();
    expectTypeOf(plugin.graphView.ui[0].slot).toEqualTypeOf<'graph.toolbar'>();
  });

  it('lets plugins contribute gated runtime graph behavior through public Graph View contracts', () => {
    const premiumAccess = 'premiumFeature' as CodeGraphyAccessKey;

    const positionedRuntimeNode = {
      id: 'runtime:frontend',
      label: 'Runtime Frontend',
      color: '#84cc16',
      nodeType: 'acme:runtime',
      x: 120,
      y: 240,
      fx: 120,
      fy: 240,
      vx: 0,
      vy: 0,
    } satisfies IGraphViewRuntimeNode;

    const runtimeNode = {
      id: 'acme.graph.runtime-node',
      label: 'Runtime Node',
      requiresAccess: premiumAccess,
      createNodes() {
        return [positionedRuntimeNode];
      },
    } satisfies IGraphViewRuntimeNodeContribution;

    const runtimeEdge = {
      id: 'acme.graph.runtime-edge',
      label: 'Runtime Edge',
      requiresAccess: premiumAccess,
      createEdges() {
        return [{
          id: 'runtime:frontend->src/App.tsx#acme:member',
          from: 'runtime:frontend',
          to: 'src/App.tsx',
          kind: 'acme:member',
          sources: [],
        }];
      },
    } satisfies IGraphViewRuntimeEdgeContribution;

    const projection = {
      id: 'acme.graph.projection',
      label: 'Runtime Projection',
      requiresAccess: premiumAccess,
      project({ visibleGraph }) {
        return visibleGraph;
      },
    } satisfies IGraphViewProjectionContribution;

    const force = {
      id: 'acme.graph.force',
      label: 'Runtime Force',
      requiresAccess: premiumAccess,
      create() {
        return {
          tick() {},
          dispose() {},
        };
      },
    } satisfies IGraphViewForceAdapterContribution;

    const contextMenu = {
      id: 'acme.graph.context-menu',
      label: 'Run Runtime Action',
      requiresAccess: premiumAccess,
      targets: [{ kind: 'multiSelection' }],
      run() {},
    } satisfies IGraphViewContextMenuContribution;

    const plugin = {
      id: 'acme.graph-tools',
      name: 'Acme Graph Tools',
      version: '0.1.0',
      apiVersion: '^3.0.0',
      supportedExtensions: ['*'],
      requiresAccess: premiumAccess,
      graphView: {
        runtimeNodes: [runtimeNode],
        runtimeEdges: [runtimeEdge],
        projections: [projection],
        forces: [force],
        contextMenu: [contextMenu],
      },
    } satisfies IPlugin;

    expectTypeOf(plugin.graphView.forces[0]).toMatchTypeOf<IGraphViewForceAdapterContribution>();
    expectTypeOf(plugin.graphView.contextMenu[0].targets[0]).toMatchTypeOf<{ kind: 'multiSelection' }>();
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

  it('types package plugins that ship webview assets and bridge messages through the host API', () => {
    const plugin = {
      id: 'acme.graph-tools',
      name: 'Acme Graph Tools',
      version: '0.1.0',
      apiVersion: '^3.0.0',
      supportedExtensions: [],
      webviewApiVersion: '^1.0.0',
      webviewContributions: {
        scripts: ['dist/webview.js'],
        styles: ['dist/webview.css'],
      },
      onLoad(api) {
        const graph = api.getGraph();
        api.sendToWebview({
          type: 'runtimeDataUpdated',
          data: { nodes: graph.nodes },
        });
        api.onWebviewMessage((message) => {
          api.log('info', message.type);
        });
      },
      onWebviewReady() {
        // no-op: contract assertion only
      },
    } satisfies IPlugin;

    expectTypeOf(plugin.webviewContributions.scripts[0]).toEqualTypeOf<string>();
    expectTypeOf(plugin.onLoad).toMatchTypeOf<IPlugin['onLoad']>();
    expectTypeOf(plugin.onWebviewReady).toMatchTypeOf<IPlugin['onWebviewReady']>();
  });

  it('types webview plugins that register Graph View contributions through the public webview API', () => {
    const api = {
      registerGraphViewContributions(contributions) {
        expectTypeOf(contributions.runtimeNodes![0]!).toMatchTypeOf<IGraphViewRuntimeNodeContribution>();
        return { dispose() {} };
      },
    } satisfies Pick<CodeGraphyWebviewAPI, 'registerGraphViewContributions'>;

    const disposable = api.registerGraphViewContributions({
      runtimeNodes: [{
        id: 'acme.runtime-node',
        label: 'Runtime Node',
        createNodes: () => [{ id: 'runtime', label: 'Runtime', color: '#ffffff' }],
      }],
    });

    expectTypeOf(disposable.dispose).toEqualTypeOf<() => void>();
  });
});
