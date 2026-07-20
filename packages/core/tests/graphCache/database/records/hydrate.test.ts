import { describe, expect, it } from 'vitest';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IWorkspaceAnalysisCache } from '../../../../src/analysis/cache';
import { hydrateDatabaseRecords } from '../../../../src/graphCache/database/records/hydrate';
import { normalizeDatabaseRecords } from '../../../../src/graphCache/database/records/normalize';

describe('graphCache/database/hydrate', () => {
  it('reconstructs analysis facts and hides cache-tier records from the canonical graph', () => {
    const analysis: IFileAnalysisResult & { cache: { tiers: string[] } } = {
      filePath: '/workspace/src/app.ts',
      cache: { tiers: ['baseline', 'symbols', 'plugin:vue'] },
      symbols: [{
        id: '/workspace/src/app.ts#App',
        filePath: '/workspace/src/app.ts',
        kind: 'class',
        name: 'App',
      }],
    };
    const cache: IWorkspaceAnalysisCache = {
      version: '1',
      files: {
        'src/app.ts': {
          mtime: 1,
          analysis,
        },
      },
    };
    const records = normalizeDatabaseRecords(cache);
    const hydrated = hydrateDatabaseRecords(records.files, records.nodes, records.edges);

    expect(hydrated.files[0]?.analysis).toEqual(analysis);
    expect(hydrated.graph.nodes.map(node => node.nodeType)).not.toContain('codegraphy:cache-tier');
    expect(hydrated.graph.edges.map(edge => edge.kind)).not.toContain('codegraphy:has-cache-tier');
  });
});
