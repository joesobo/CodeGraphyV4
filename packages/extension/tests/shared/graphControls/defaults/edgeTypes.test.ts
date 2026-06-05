import { describe, expect, it } from 'vitest';
import {
  CORE_GRAPH_EDGE_TYPES,
  STRUCTURAL_NESTS_EDGE_KIND,
  createCoreGraphEdgeTypes,
} from '../../../../src/shared/graphControls/defaults/edgeTypes';

describe('shared/graphControls/defaults/edgeTypes', () => {
  it('declares the structural nests edge and the built-in edge defaults', () => {
    expect(STRUCTURAL_NESTS_EDGE_KIND).toBe('nests');
    const edgeTypes = createCoreGraphEdgeTypes();

    expect(edgeTypes).toMatchObject([
      {
        id: 'import',
        label: 'Imports',
        defaultColor: '#60A5FA',
        defaultVisible: true,
      },
      {
        id: 'reference',
        label: 'References',
        defaultColor: '#F97316',
        defaultVisible: false,
      },
      {
        id: 'call',
        label: 'Calls',
        defaultColor: '#22C55E',
        defaultVisible: false,
      },
      {
        id: 'type-import',
        label: 'Type imports',
        defaultColor: '#38BDF8',
        defaultVisible: false,
      },
      {
        id: 'inherit',
        label: 'Inherits',
        defaultColor: '#F59E0B',
        defaultVisible: false,
      },
      {
        id: 'load',
        label: 'Loads',
        defaultColor: '#06B6D4',
        defaultVisible: false,
      },
      {
        id: 'nests',
        label: 'Nests',
        defaultColor: '#64748B',
        defaultVisible: false,
      },
      {
        id: 'contains',
        label: 'Contains',
        defaultColor: '#94A3B8',
        defaultVisible: false,
      },
      {
        id: 'overrides',
        label: 'Overrides',
        defaultColor: '#EC4899',
        defaultVisible: false,
      },
    ]);
    expect(edgeTypes.every((edgeType) => edgeType.description?.description)).toBe(true);
    expect(edgeTypes.find((edgeType) => edgeType.id === 'import')?.description?.examples?.[0]?.code)
      .toBe('import { thing } from "./module";');
    expect(edgeTypes.find((edgeType) => edgeType.id === 'inherit')?.description?.examples?.[0]?.code)
      .toBe('class Child extends Parent {}');
    expect(CORE_GRAPH_EDGE_TYPES).toEqual(createCoreGraphEdgeTypes());
  });
});
