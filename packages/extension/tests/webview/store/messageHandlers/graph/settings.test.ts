import { describe, expect, it, vi } from 'vitest';
import {
  handleActiveFileUpdated,
  handleDepthLimitRangeUpdated,
  handleDepthLimitUpdated,
  handleDepthModeUpdated,
  handleDirectionSettingsUpdated,
  handleFilterPatternsUpdated,
  handleLegendsUpdated,
  handleMaxFilesUpdated,
  handlePhysicsSettingsUpdated,
  handleSettingsUpdated,
  handleShowFpsUpdated,
  handleShowLabelsUpdated,
  handleVerboseDiagnosticsUpdated,
} from '../../../../../src/webview/store/messageHandlers/graph';
import { createState } from './fixture';

describe('graph message handlers: settings',()=>{
  it('maps settings and filter payloads', () => {
      expect(handleSettingsUpdated({
        type: 'SETTINGS_UPDATED',
        payload: { bidirectionalEdges: 'combined', showOrphans: false },
      })).toEqual({
        bidirectionalMode: 'combined',
        showOrphans: false,
      });
  
      expect(handleFilterPatternsUpdated({
        type: 'FILTER_PATTERNS_UPDATED',
        payload: {
          patterns: ['dist/**'],
          pluginPatterns: ['plugin/**'],
          pluginPatternGroups: [],
          disabledCustomPatterns: ['custom/**'],
          disabledPluginPatterns: [],
        },
      })).toEqual({
        filterPatterns: ['dist/**'],
        pluginFilterPatterns: ['plugin/**'],
        pluginFilterGroups: [],
        disabledCustomFilterPatterns: ['custom/**'],
        disabledPluginFilterPatterns: [],
      });
    });

  it('maps depth, direction, physics, labels, max-files, and active-file payloads', () => {
      expect(handleDepthModeUpdated({
        type: 'DEPTH_MODE_UPDATED',
        payload: { depthMode: true },
      })).toEqual({ depthMode: true });
  
      expect(handlePhysicsSettingsUpdated({
        type: 'PHYSICS_SETTINGS_UPDATED',
        payload: { repelForce: 18, linkDistance: 150, linkForce: 0.2, damping: 0.5, centerForce: 0.3 },
      })).toEqual({
        physicsSettings: { repelForce: 18, linkDistance: 150, linkForce: 0.2, damping: 0.5, centerForce: 0.3 },
      });
  
      expect(handleDepthLimitUpdated({
        type: 'DEPTH_LIMIT_UPDATED',
        payload: { depthLimit: 7 },
      })).toEqual({ depthLimit: 7 });
  
      expect(handleDepthLimitRangeUpdated({
        type: 'DEPTH_LIMIT_RANGE_UPDATED',
        payload: { maxDepthLimit: 12 },
      })).toEqual({ maxDepthLimit: 12 });
  
      expect(handleDirectionSettingsUpdated({
          type: 'DIRECTION_SETTINGS_UPDATED',
          payload: {
          directionMode: 'arrows',
          directionColor: '#22C55E',
          particleSpeed: 3,
          particleSize: 4,
        },
      })).toEqual({
        directionMode: 'arrows',
        directionColor: '#22C55E',
        particleSpeed: 3,
        particleSize: 4,
      });
  
      expect(handleShowLabelsUpdated({
        type: 'SHOW_LABELS_UPDATED',
        payload: { showLabels: false },
      })).toEqual({ showLabels: false });
  
      expect(handleMaxFilesUpdated({
        type: 'MAX_FILES_UPDATED',
        payload: { maxFiles: 250 },
      })).toEqual({ maxFiles: 250 });
  
      expect(handleShowFpsUpdated({
        type: 'SHOW_FPS_UPDATED',
        payload: { showFps: true },
      })).toEqual({ showFps: true });
  
      expect(handleVerboseDiagnosticsUpdated({
        type: 'VERBOSE_DIAGNOSTICS_UPDATED',
        payload: { verboseDiagnostics: true },
      })).toEqual({ verboseDiagnostics: true });
  
      expect(handleActiveFileUpdated({
        type: 'ACTIVE_FILE_UPDATED',
        payload: { filePath: 'src/app.ts' },
      })).toEqual({ activeFilePath: 'src/app.ts' });
  
      expect(handleActiveFileUpdated({
        type: 'ACTIVE_FILE_UPDATED',
        payload: { filePath: undefined },
      })).toEqual({ activeFilePath: null });
    });

  it('returns nothing when legends and optimistic updates are unchanged', () => {
      const legends = [{ id: 'src', pattern: 'src/**', color: '#22C55E' }];
      const state = createState({
        legends,
        optimisticLegendUpdates: {},
        optimisticUserLegends: null,
      });
  
      const result = handleLegendsUpdated(
        {
          type: 'LEGENDS_UPDATED',
          payload: { legends: [{ id: 'src', pattern: 'src/**', color: '#22C55E' }] },
        },
        { getState: () => state, postMessage: vi.fn() },
      );
  
      expect(result).toBeUndefined();
    });

  it('returns merged legends when the host payload changes them', () => {
      const state = createState({
        legends: [{ id: 'src', pattern: 'src/**', color: '#22C55E' }],
        optimisticLegendUpdates: {},
        optimisticUserLegends: null,
      });
  
      expect(handleLegendsUpdated(
        {
          type: 'LEGENDS_UPDATED',
          payload: { legends: [{ id: 'src', pattern: 'src/**', color: '#F59E0B' }] },
        },
        { getState: () => state, postMessage: vi.fn() },
      )).toEqual({
        legends: [{ id: 'src', pattern: 'src/**', color: '#F59E0B' }],
        optimisticUserLegends: null,
        optimisticLegendUpdates: {},
      });
    });
});
