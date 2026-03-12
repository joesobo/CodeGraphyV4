import { describe, it, expect } from 'vitest';
import { buildMarkdownExport } from '../../../src/webview/lib/exportMd';
import type { IGraphData } from '../../../src/shared/types';

describe('buildMarkdownExport', () => {
  it('produces valid markdown with zero stats for an empty graph', () => {
    const data: IGraphData = { nodes: [], edges: [] };
    const result = buildMarkdownExport(data);
    expect(result).toContain('# CodeGraphy Export');
    expect(result).toContain('0 files, 0 connections');
  });

  it('lists files with imports as bold with nested items', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'src/App.tsx', label: 'App.tsx', color: '#fff' },
        { id: 'src/Graph.tsx', label: 'Graph.tsx', color: '#fff' },
        { id: 'src/store.ts', label: 'store.ts', color: '#fff' },
      ],
      edges: [
        { id: 'src/App.tsx->src/Graph.tsx', from: 'src/App.tsx', to: 'src/Graph.tsx' },
        { id: 'src/App.tsx->src/store.ts', from: 'src/App.tsx', to: 'src/store.ts' },
      ],
    };

    const result = buildMarkdownExport(data);
    expect(result).toContain('- **src/App.tsx**');
    expect(result).toContain('  - src/Graph.tsx');
    expect(result).toContain('  - src/store.ts');
  });

  it('lists orphan nodes without bold', () => {
    const data: IGraphData = {
      nodes: [{ id: 'orphan.ts', label: 'orphan.ts', color: '#fff' }],
      edges: [],
    };

    const result = buildMarkdownExport(data);
    expect(result).toContain('- orphan.ts');
    expect(result).not.toContain('**orphan.ts**');
  });

  it('sorts files alphabetically', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'z.ts', label: 'z.ts', color: '#fff' },
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'm.ts', label: 'm.ts', color: '#fff' },
      ],
      edges: [],
    };

    const result = buildMarkdownExport(data);
    const aIdx = result.indexOf('a.ts');
    const mIdx = result.indexOf('m.ts');
    const zIdx = result.indexOf('z.ts');
    expect(aIdx).toBeLessThan(mIdx);
    expect(mIdx).toBeLessThan(zIdx);
  });

  it('stats match node and edge counts', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
      ],
      edges: [{ id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' }],
    };

    const result = buildMarkdownExport(data);
    expect(result).toContain('2 files, 1 connections');
  });
});
