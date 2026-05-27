import { describe, expect, it } from 'vitest';
import { WORKSPACE_ANALYSIS_CACHE_VERSION } from '../../src/analysis/cache';
import { collectCodeGraphyWorkspaceStaleReasons } from '../../src/workspace/statusReasons';

const freshInput = {
  hasGraphCache: true,
  indexedAt: '2026-05-26T00:00:00.000Z',
  metaPluginSignature: 'plugins',
  metaSettingsSignature: 'settings',
  metaAnalysisVersion: WORKSPACE_ANALYSIS_CACHE_VERSION,
  pendingChangedFiles: [],
  pluginSignature: 'plugins',
  settingsSignature: 'settings',
};

describe('workspace/statusReasons', () => {
  it('reports missing cache reasons before comparing signatures', () => {
    expect(collectCodeGraphyWorkspaceStaleReasons({
      ...freshInput,
      hasGraphCache: false,
      indexedAt: null,
    })).toEqual(['never-indexed']);
    expect(collectCodeGraphyWorkspaceStaleReasons({
      ...freshInput,
      hasGraphCache: false,
    })).toEqual(['graph-cache-missing']);
    expect(collectCodeGraphyWorkspaceStaleReasons({
      ...freshInput,
      indexedAt: null,
    })).toEqual(['never-indexed']);
  });

  it('collects stale workspace reasons from pending files and signature drift', () => {
    expect(collectCodeGraphyWorkspaceStaleReasons({
      ...freshInput,
      pendingChangedFiles: ['src/app.ts'],
      metaPluginSignature: 'old-plugins',
      metaSettingsSignature: 'old-settings',
      metaAnalysisVersion: 'old-version',
    })).toEqual([
      'pending-changed-files',
      'plugin-signature-changed',
      'settings-signature-changed',
      'analysis-version-changed',
    ]);
    expect(collectCodeGraphyWorkspaceStaleReasons(freshInput)).toEqual([]);
  });
});
