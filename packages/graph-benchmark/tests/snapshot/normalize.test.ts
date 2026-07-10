import { describe, expect, it } from 'vitest';

import { normalizeCodeGraphyExport } from '../../src/snapshot/normalize';

const source = {
  name: 'fixture-repository',
  repositoryUrl: 'https://github.com/example/fixture-repository',
  revision: '0123456789abcdef',
  license: 'MIT',
};

function createExport(exportedAt: string) {
  return {
    format: 'codegraphy-export' as const,
    version: '3.0',
    exportedAt,
    summary: { totalNodes: 2, totalEdges: 1 },
    legend: [{ id: 'ignored-legend' }],
    nodes: [
      { id: 'src/z.ts', label: 'z.ts', nodeType: 'file', color: '#fff', x: 99, y: 42 },
      { id: 'src/a.ts', label: 'a.ts', nodeType: 'file', color: '#000', x: -1, y: -2 },
    ],
    edges: [{
      id: 'src/z.ts->src/a.ts#import',
      from: 'src/z.ts',
      to: 'src/a.ts',
      kind: 'import',
      legendIds: ['ignored-legend'],
      sources: [{
        id: 'plugin:import',
        pluginId: 'plugin',
        pluginName: 'Ignored display name',
        sourceId: 'import',
        label: 'Import',
      }],
    }],
  };
}

describe('normalizeCodeGraphyExport', () => {
  it('creates stable sanitized fixture data from an extension export', () => {
    const first = normalizeCodeGraphyExport(createExport('2026-07-10T00:00:00Z'), source);
    const second = normalizeCodeGraphyExport(createExport('2026-07-11T00:00:00Z'), source);

    expect(first.graph.nodes).toEqual([
      { id: 'src/a.ts', label: 'a.ts', nodeType: 'file', color: '#000' },
      { id: 'src/z.ts', label: 'z.ts', nodeType: 'file', color: '#fff' },
    ]);
    expect(first.graph.edges[0]?.sources).toEqual([{
      id: 'plugin:import',
      pluginId: 'plugin',
      sourceId: 'import',
      label: 'Import',
    }]);
    expect(first.fixtureHash).toBe(second.fixtureHash);
  });
});
