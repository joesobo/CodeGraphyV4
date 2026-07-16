import { describe, expect, it } from 'vitest';
import {
  BASELINE_ANALYSIS_CACHE_TIER,
  SYMBOLS_ANALYSIS_CACHE_TIER,
  createWorkspaceIndexAnalysisCacheTiers,
  hasRequiredAnalysisCacheTiers,
  isAnalysisCacheTier,
  projectAnalysisForCacheTiers,
  sortAnalysisCacheTiers,
} from '../../../src/analysis/fileAnalysis/cacheTiers';

describe('analysis/fileAnalysis/cacheTiers', () => {
  it('keeps symbol enrichment inactive when the Symbol root scope is disabled for symbol-only children', () => {
    expect(createWorkspaceIndexAnalysisCacheTiers({
      symbol: false,
      'symbol:function': true,
    })).toEqual({
      active: [BASELINE_ANALYSIS_CACHE_TIER],
      completed: [BASELINE_ANALYSIS_CACHE_TIER],
      required: [BASELINE_ANALYSIS_CACHE_TIER],
    });
  });

  it('keeps symbol enrichment inactive when only parent scopes are enabled', () => {
    expect(createWorkspaceIndexAnalysisCacheTiers({
      symbol: true,
      variable: true,
    })).toEqual({
      active: [BASELINE_ANALYSIS_CACHE_TIER],
      completed: [BASELINE_ANALYSIS_CACHE_TIER],
      required: [BASELINE_ANALYSIS_CACHE_TIER],
    });
  });

  it('keeps symbol enrichment inactive when a leaf child is enabled under a disabled parent scope', () => {
    expect(createWorkspaceIndexAnalysisCacheTiers({
      symbol: false,
      variable: true,
      'symbol:global': true,
    })).toEqual({
      active: [BASELINE_ANALYSIS_CACHE_TIER],
      completed: [BASELINE_ANALYSIS_CACHE_TIER],
      required: [BASELINE_ANALYSIS_CACHE_TIER],
    });
  });

  it('requires symbol enrichment when an enabled leaf child has enabled parent scopes', () => {
    expect(createWorkspaceIndexAnalysisCacheTiers({
      symbol: true,
      variable: true,
      'symbol:global': true,
    })).toEqual({
      active: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
      completed: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
      required: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
    });
  });

  it('requires symbol enrichment when the Symbol root scope is enabled', () => {
    expect(createWorkspaceIndexAnalysisCacheTiers({
      symbol: true,
      'symbol:function': true,
    })).toEqual({
      active: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
      completed: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
      required: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
    });
  });

  it('requires symbol enrichment when a Unity symbol row is enabled', () => {
    expect(createWorkspaceIndexAnalysisCacheTiers({
      'plugin:codegraphy.unity:symbol': true,
      'plugin:codegraphy.unity:symbol:game-object': true,
    })).toEqual({
      active: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
      completed: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
      required: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
    });
  });

  it('validates and sorts cache tiers consistently for runtime hydration', () => {
    expect(isAnalysisCacheTier('plugin:codegraphy.vue')).toBe(true);
    expect(isAnalysisCacheTier('plugin')).toBe(false);
    expect(sortAnalysisCacheTiers([
      'plugin:codegraphy.vue',
      SYMBOLS_ANALYSIS_CACHE_TIER,
      'plugin:codegraphy.unity',
      SYMBOLS_ANALYSIS_CACHE_TIER,
    ])).toEqual([
      BASELINE_ANALYSIS_CACHE_TIER,
      SYMBOLS_ANALYSIS_CACHE_TIER,
      'plugin:codegraphy.unity',
      'plugin:codegraphy.vue',
    ]);
  });

  it('infers legacy symbol cache coverage from symbol facts', () => {
    expect(hasRequiredAnalysisCacheTiers({
      filePath: '/workspace/src/app.ts',
      relations: [{
        kind: 'call',
        sourceId: 'test',
        fromFilePath: '/workspace/src/app.ts',
        fromSymbolId: 'src/app.ts:function:run',
      }],
    }, [SYMBOLS_ANALYSIS_CACHE_TIER])).toBe(true);
    expect(hasRequiredAnalysisCacheTiers({
      filePath: '/workspace/src/app.ts',
      symbols: [],
    }, [SYMBOLS_ANALYSIS_CACHE_TIER])).toBe(true);
  });

  it('distinguishes explicit, plugin, baseline, and missing cache tiers', () => {
    expect(hasRequiredAnalysisCacheTiers({
      filePath: '/workspace/src/app.ts',
      cache: { tiers: [BASELINE_ANALYSIS_CACHE_TIER, 'plugin:vue'] },
    } as never, ['plugin:vue'])).toBe(true);
    expect(hasRequiredAnalysisCacheTiers({
      filePath: '/workspace/src/app.ts',
      symbols: [{
        id: 'component', filePath: '/workspace/src/app.ts', kind: 'component', name: 'App',
        metadata: { pluginId: 'vue' },
      }],
    }, ['plugin:vue'])).toBe(true);
    expect(hasRequiredAnalysisCacheTiers({ filePath: '/workspace/src/app.ts' }, [BASELINE_ANALYSIS_CACHE_TIER])).toBe(true);
    expect(hasRequiredAnalysisCacheTiers({ filePath: '/workspace/src/app.ts' }, ['plugin:vue'])).toBe(false);
  });

  it('does not downgrade same-file symbol containment into a file self-edge', () => {
    expect(projectAnalysisForCacheTiers({
      filePath: '/workspace/Assets/Prefabs/Player.prefab',
      symbols: [{
        id: 'Assets/Prefabs/Player.prefab#unity:game-object:1000',
        filePath: '/workspace/Assets/Prefabs/Player.prefab',
        kind: 'game-object',
        name: 'Player',
      }],
      relations: [{
        kind: 'contains',
        sourceId: 'unity-containment',
        fromFilePath: '/workspace/Assets/Prefabs/Player.prefab',
        toFilePath: '/workspace/Assets/Prefabs/Player.prefab',
        toSymbolId: 'Assets/Prefabs/Player.prefab#unity:game-object:1000',
      }],
    } as never, [BASELINE_ANALYSIS_CACHE_TIER])).toEqual({
      filePath: '/workspace/Assets/Prefabs/Player.prefab',
      symbols: [],
      relations: [],
    });
  });

  it('does not downgrade file-to-symbol containment without a target path into a file self-edge', () => {
    expect(projectAnalysisForCacheTiers({
      filePath: '/workspace/Assets/Prefabs/Enemy1.prefab',
      symbols: [{
        id: 'Assets/Prefabs/Enemy1.prefab#unity:game-object:1000',
        filePath: '/workspace/Assets/Prefabs/Enemy1.prefab',
        kind: 'game-object',
        name: 'Enemy 1',
      }],
      relations: [{
        kind: 'contains',
        sourceId: 'unity-containment',
        fromFilePath: '/workspace/Assets/Prefabs/Enemy1.prefab',
        toSymbolId: 'Assets/Prefabs/Enemy1.prefab#unity:game-object:1000',
      }],
    } as never, [BASELINE_ANALYSIS_CACHE_TIER])).toEqual({
      filePath: '/workspace/Assets/Prefabs/Enemy1.prefab',
      symbols: [],
      relations: [],
    });
  });

  it('keeps inactive plugin-owned evidence out of projected runtime cache tiers', () => {
    expect(projectAnalysisForCacheTiers({
      filePath: '/workspace/src/App.vue',
      cache: {
        tiers: [
          BASELINE_ANALYSIS_CACHE_TIER,
          SYMBOLS_ANALYSIS_CACHE_TIER,
          'plugin:codegraphy.vue',
        ],
      },
      nodes: [
        {
          id: 'src/App.vue',
          label: 'App.vue',
          nodeType: 'file',
        },
        {
          id: 'src/App.vue#component',
          label: 'App',
          metadata: { pluginId: 'codegraphy.vue' },
          nodeType: 'plugin:codegraphy.vue:component',
        },
      ],
      symbols: [{
        id: 'src/App.vue#component',
        filePath: '/workspace/src/App.vue',
        kind: 'component',
        metadata: { pluginId: 'codegraphy.vue' },
        name: 'App',
      }],
      relations: [
        {
          kind: 'import',
          sourceId: 'core:treesitter:import',
          fromFilePath: '/workspace/src/App.vue',
          toFilePath: '/workspace/src/main.ts',
        },
        {
          kind: 'contains',
          pluginId: 'codegraphy.vue',
          sourceId: 'codegraphy.vue:component',
          fromFilePath: '/workspace/src/App.vue',
          toNodeId: 'src/App.vue#component',
        },
      ],
    } as never, [BASELINE_ANALYSIS_CACHE_TIER])).toEqual({
      filePath: '/workspace/src/App.vue',
      cache: {
        tiers: [BASELINE_ANALYSIS_CACHE_TIER],
      },
      nodes: [
        {
          id: 'src/App.vue',
          label: 'App.vue',
          nodeType: 'file',
        },
      ],
      symbols: [],
      relations: [{
        kind: 'import',
        sourceId: 'core:treesitter:import',
        fromFilePath: '/workspace/src/App.vue',
        toFilePath: '/workspace/src/main.ts',
      }],
    });
  });

  it('does not mark a requested plugin tier as loaded when persisted cache metadata is missing it', () => {
    expect(projectAnalysisForCacheTiers({
      filePath: '/workspace/src/App.vue',
      cache: {
        tiers: [BASELINE_ANALYSIS_CACHE_TIER],
      },
      nodes: [
        {
          id: 'src/App.vue',
          label: 'App.vue',
          nodeType: 'file',
        },
      ],
      relations: [],
    } as never, [
      BASELINE_ANALYSIS_CACHE_TIER,
      'plugin:codegraphy.vue',
    ])).toEqual({
      filePath: '/workspace/src/App.vue',
      cache: {
        tiers: [BASELINE_ANALYSIS_CACHE_TIER],
      },
      nodes: [
        {
          id: 'src/App.vue',
          label: 'App.vue',
          nodeType: 'file',
        },
      ],
      relations: [],
    });
  });
});
