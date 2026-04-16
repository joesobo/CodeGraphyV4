import { describe, expect, it } from 'vitest';
import { DEFAULT_NODE_COLOR } from '../../../../src/shared/fileColors';
import type { IGraphData } from '../../../../src/shared/graph/types';
import type { IGroup } from '../../../../src/shared/settings/groups';
import { applyLegendRules } from '../../../../src/webview/search/filtering/rules';

const graphData: IGraphData = {
  nodes: [
    { id: 'src/App.ts', label: 'App', color: '#111111' },
    { id: 'src/util.ts', label: 'utility', color: '' },
    { id: 'README.md', label: 'README', color: '#333333' },
  ],
  edges: [
    { id: 'edge-1', from: 'src/App.ts', to: 'src/util.ts', kind: 'import', sources: [] },
    { id: 'edge-2', from: 'src/util.ts', to: 'README.md', kind: 'import', sources: [] },
  ],
};

describe('search/filtering/rules', () => {
  it('returns null for null data and preserves the original graph when there are no rules', () => {
    expect(applyLegendRules(null, [])).toBeNull();
    expect(applyLegendRules(graphData, [])).toBe(graphData);
  });

  it('returns null without reading graph fields when legend rules exist but graph data is missing', () => {
    const groups: IGroup[] = [{ id: 'markdown', pattern: '*.md', color: '#00ff00' }];

    expect(() => applyLegendRules(null, groups)).not.toThrow();
    expect(applyLegendRules(null, groups)).toBeNull();
  });

  it('applies legend rules from bottom to top so later matches override earlier ones', () => {
    const groups: IGroup[] = [
      {
        id: 'specific',
        pattern: 'src/App.ts',
        color: '#00ff00',
        imageUrl: 'icon.png',
      },
      { id: 'disabled', pattern: 'src/**', color: '#999999', disabled: true },
      {
        id: 'typescript',
        pattern: 'src/**',
        color: '#ff0000',
        shape2D: 'diamond',
        shape3D: 'cube',
      },
    ];

    const result = applyLegendRules(graphData, groups);

    expect(result?.nodes[0]).toMatchObject({
      color: '#00ff00',
      shape2D: 'diamond',
      shape3D: 'cube',
      imageUrl: 'icon.png',
    });
  });

  it('falls back to the existing node color or the default color when no group matches', () => {
    const groups: IGroup[] = [{ id: 'markdown', pattern: '*.md', color: '#00ff00' }];

    const result = applyLegendRules(graphData, groups);

    expect(result?.nodes[0]?.color).toBe('#111111');
    expect(result?.nodes[1]?.color).toBe(DEFAULT_NODE_COLOR);
    expect(result?.nodes[2]?.color).toBe('#00ff00');
  });

  it('applies edge-targeted legend rules without changing matching nodes', () => {
    const groups: IGroup[] = [
      { id: 'import-edges', pattern: 'import', color: '#ff8800', target: 'edge' },
    ];

    const result = applyLegendRules(graphData, groups);

    expect(result?.edges[0]?.color).toBe('#ff8800');
    expect(result?.edges[1]?.color).toBe('#ff8800');
    expect(result?.nodes[0]?.color).toBe('#111111');
  });
});
