import { beforeEach, describe, expect, it } from 'vitest';
import { createGraphStore } from '../../../../../src/webview/store/state';
import { clearSentMessages } from '../../../../helpers/sentMessages';

describe('GraphStore plugin messages',()=>{
  let store: ReturnType<typeof createGraphStore>;
  beforeEach(()=>{ store=createGraphStore(); clearSentMessages(); });

  it('handles PLUGINS_UPDATED message', () => {
      const plugins = [{
        id: 'ts',
        name: 'TypeScript',
        version: '1.0',
        supportedExtensions: ['.ts'],
        status: 'active' as const,
        enabled: true,
        connectionCount: 5,
      }];
      store.getState().handleExtensionMessage({
        type: 'PLUGINS_UPDATED',
        payload: { plugins },
      });
      expect(store.getState().pluginStatuses).toEqual(plugins);
    });

  it('handles PLUGIN_EXPORTERS_UPDATED message', () => {
      const items = [{
        id: 'summary',
        label: 'Summary Export',
        pluginId: 'plugin.docs',
        pluginName: 'Docs Plugin',
        index: 0,
        group: 'Reports',
      }];
      store.getState().handleExtensionMessage({
        type: 'PLUGIN_EXPORTERS_UPDATED',
        payload: { items },
      });
      expect(store.getState().pluginExporters).toEqual(items);
    });

  it('handles PLUGIN_TOOLBAR_ACTIONS_UPDATED message', () => {
      const items = [{
        id: 'wikilinks',
        label: 'Docs',
        pluginId: 'plugin.docs',
        pluginName: 'Docs Plugin',
        index: 0,
        items: [{
          id: 'docs-summary',
          label: 'Docs Summary',
          index: 0,
        }],
      }];
      store.getState().handleExtensionMessage({
        type: 'PLUGIN_TOOLBAR_ACTIONS_UPDATED',
        payload: { items },
      });
      expect(store.getState().pluginToolbarActions).toEqual(items);
    });

  it('handles GRAPH_VIEW_CONTRIBUTIONS_UPDATED message', () => {
      const contributions = [{
        kind: 'runtimeNodes' as const,
        pluginId: 'acme.graph-tools',
        contributionId: 'acme.graph-tools.runtime-nodes',
        label: 'Runtime Nodes',
      }];
  
      store.getState().handleExtensionMessage({
        type: 'GRAPH_VIEW_CONTRIBUTIONS_UPDATED',
        payload: { contributions },
      });
  
      expect(store.getState().graphViewContributionStatuses).toEqual(contributions);
    });

  it('handles MAX_FILES_UPDATED message', () => {
      store.getState().handleExtensionMessage({
        type: 'MAX_FILES_UPDATED',
        payload: { maxFiles: 1000 },
      });
      expect(store.getState().maxFiles).toBe(1000);
    });

  it('handles ACTIVE_FILE_UPDATED message', () => {
      store.getState().handleExtensionMessage({
        type: 'ACTIVE_FILE_UPDATED',
        payload: { filePath: 'src/game/player.gd' },
      });
      expect(store.getState().activeFilePath).toBe('src/game/player.gd');
    });
});
