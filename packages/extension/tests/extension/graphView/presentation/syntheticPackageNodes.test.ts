import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import { filterSyntheticPackageNodes } from '../../../../src/extension/graphView/presentation/syntheticPackageNodes';

const graphData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#ffffff' },
    { id: 'pkg:fs', label: 'fs', color: '#F59E0B', nodeType: 'package', shape2D: 'hexagon', shape3D: 'cube' },
  ],
  edges: [
    {
      id: 'src/app.ts->pkg:fs#import',
      from: 'src/app.ts',
      to: 'pkg:fs',
      kind: 'import',
      sources: [],
    },
  ],
};

describe('graphView/presentation/syntheticPackageNodes', () => {
  it('keeps package nodes in the unified graph surface', () => {
    expect(filterSyntheticPackageNodes(graphData)).toBe(graphData);
  });

  it('keeps package nodes in plugin-focused views too', () => {
    expect(filterSyntheticPackageNodes(graphData)).toBe(graphData);
  });
});
