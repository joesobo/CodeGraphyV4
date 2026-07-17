import { beforeEach, describe, expect, it } from 'vitest';
import { createGraphStore } from '../../../../../src/webview/store/state';
import { clearSentMessages } from '../../../../helpers/sentMessages';

describe('GraphStore settings messages',()=>{
  let store: ReturnType<typeof createGraphStore>;
  beforeEach(()=>{ store=createGraphStore(); clearSentMessages(); });

  it('handles SETTINGS_UPDATED message', () => {
      store.getState().handleExtensionMessage({
        type: 'SETTINGS_UPDATED',
        payload: { bidirectionalEdges: 'combined', showMinimap: false, showOrphans: false },
      });
      expect(store.getState().bidirectionalMode).toBe('combined');
      expect(store.getState().showMinimap).toBe(false);
      expect(store.getState().showOrphans).toBe(false);
    });

  it('handles DIRECTION_SETTINGS_UPDATED message', () => {
      store.getState().handleExtensionMessage({
        type: 'DIRECTION_SETTINGS_UPDATED',
        payload: { directionMode: 'particles', directionColor: '#00FF00', particleSpeed: 0.01, particleSize: 6 },
      });
      expect(store.getState().directionMode).toBe('particles');
      expect(store.getState().directionColor).toBe('#00FF00');
      expect(store.getState().particleSpeed).toBe(0.01);
      expect(store.getState().particleSize).toBe(6);
    });

  it('handles SHOW_LABELS_UPDATED message', () => {
      store.getState().handleExtensionMessage({
        type: 'SHOW_LABELS_UPDATED',
        payload: { showLabels: false },
      });
      expect(store.getState().showLabels).toBe(false);
    });

  it('handles LEGENDS_UPDATED message', () => {
      const legends = [{ id: 'g1', pattern: 'src/**', color: '#ff0000' }];
      store.getState().handleExtensionMessage({
        type: 'LEGENDS_UPDATED',
        payload: { legends },
      });
      expect(store.getState().legends).toEqual(legends);
    });

  it('handles FILTER_PATTERNS_UPDATED message', () => {
      store.getState().handleExtensionMessage({
        type: 'FILTER_PATTERNS_UPDATED',
        payload: {
          patterns: ['*.test.ts'],
          pluginPatterns: ['*.uid'],
          pluginPatternGroups: [],
          disabledCustomPatterns: ['custom/**'],
          disabledPluginPatterns: [],
        },
      });
      expect(store.getState().filterPatterns).toEqual(['*.test.ts']);
      expect(store.getState().pluginFilterPatterns).toEqual(['*.uid']);
      expect(store.getState().disabledCustomFilterPatterns).toEqual(['custom/**']);
      expect(store.getState().disabledPluginFilterPatterns).toEqual([]);
    });

  it('handles DEPTH_MODE_UPDATED message', () => {
      store.getState().handleExtensionMessage({
        type: 'DEPTH_MODE_UPDATED',
        payload: { depthMode: true },
      });
      expect(store.getState().depthMode).toBe(true);
    });

  it('handles PHYSICS_SETTINGS_UPDATED message', () => {
      const physics = { repelForce: 15, linkDistance: 100, linkForce: 0.2, damping: 0.5, centerForce: 0.3 };
      store.getState().handleExtensionMessage({
        type: 'PHYSICS_SETTINGS_UPDATED',
        payload: physics,
      });
      expect(store.getState().physicsSettings).toEqual(physics);
    });

  it('handles DEPTH_LIMIT_UPDATED message', () => {
      store.getState().handleExtensionMessage({
        type: 'DEPTH_LIMIT_UPDATED',
        payload: { depthLimit: 4 },
      });
      expect(store.getState().depthLimit).toBe(4);
    });

  it('handles DEPTH_LIMIT_RANGE_UPDATED message', () => {
      store.getState().handleExtensionMessage({
        type: 'DEPTH_LIMIT_RANGE_UPDATED',
        payload: { maxDepthLimit: 2 },
      });
      expect(store.getState().maxDepthLimit).toBe(2);
    });
});
