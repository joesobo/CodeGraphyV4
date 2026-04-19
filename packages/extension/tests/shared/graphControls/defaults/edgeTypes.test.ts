import { describe, expect, it } from 'vitest';
import {
  CORE_GRAPH_EDGE_TYPES,
  STRUCTURAL_NESTS_EDGE_KIND,
  createCoreGraphEdgeTypes,
} from '../../../../src/shared/graphControls/defaults/edgeTypes';

describe('shared/graphControls/defaults/edgeTypes', () => {
  it('declares the structural nests edge and the built-in edge defaults', () => {
    expect(STRUCTURAL_NESTS_EDGE_KIND).toBe('codegraphy:nests');
    expect(createCoreGraphEdgeTypes()).toEqual([
      {
        id: 'codegraphy:nests',
        label: 'Nests',
        defaultColor: '#64748B',
        defaultVisible: true,
      },
      {
        id: 'import',
        label: 'Imports',
        defaultColor: '#60A5FA',
        defaultVisible: true,
      },
      {
        id: 'type-import',
        label: 'Type imports',
        defaultColor: '#38BDF8',
        defaultVisible: false,
      },
      {
        id: 'reexport',
        label: 'Re-exports',
        defaultColor: '#A78BFA',
        defaultVisible: true,
      },
      {
        id: 'call',
        label: 'Calls',
        defaultColor: '#22C55E',
        defaultVisible: true,
      },
      {
        id: 'inherit',
        label: 'Inherits',
        defaultColor: '#F59E0B',
        defaultVisible: true,
      },
      {
        id: 'reference',
        label: 'References',
        defaultColor: '#F97316',
        defaultVisible: true,
      },
      {
        id: 'test',
        label: 'Tests',
        defaultColor: '#EF4444',
        defaultVisible: true,
      },
      {
        id: 'load',
        label: 'Loads',
        defaultColor: '#06B6D4',
        defaultVisible: true,
      },
    ]);
    expect(CORE_GRAPH_EDGE_TYPES).toEqual(createCoreGraphEdgeTypes());
  });
});
