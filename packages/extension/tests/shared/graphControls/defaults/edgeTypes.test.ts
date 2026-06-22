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
        id: 'include',
        label: 'Include',
        defaultColor: '#38BDF8',
        defaultVisible: true,
      },
      {
        id: 'import',
        label: 'Imports',
        defaultColor: '#60A5FA',
        defaultVisible: true,
      },
      {
        id: 'using',
        label: 'Using',
        defaultColor: '#60A5FA',
        defaultVisible: true,
      },
      {
        id: 'type',
        label: 'Type',
        defaultColor: '#EC4899',
        defaultVisible: false,
      },
      {
        id: 'reference',
        label: 'References',
        defaultColor: '#F97316',
        defaultVisible: false,
      },
      {
        id: 'call',
        label: 'Call',
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
        id: 'implements',
        label: 'Implements',
        defaultColor: '#FBBF24',
        defaultVisible: false,
      },
      {
        id: 'event',
        label: 'Events',
        defaultColor: '#A855F7',
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
        defaultVisible: true,
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
      {
        id: 'codegraphy.gdscript:signal-connection',
        label: 'Signal Connections',
        defaultColor: '#EF4444',
        defaultVisible: false,
      },
    ]);
    expect(edgeTypes.every((edgeType) => edgeType.description?.description)).toBe(true);
    expect(edgeTypes.find((edgeType) => edgeType.id === 'import')?.description?.examples?.[0]?.code)
      .toBe('import { thing } from "./module";');
    expect(edgeTypes.find((edgeType) => edgeType.id === 'inherit')?.description?.examples?.[0]?.code)
      .toBe('class Child extends Parent {}');
    expect(edgeTypes.find((edgeType) => edgeType.id === 'type')?.description?.examples?.[0]?.code)
      .toBe('private readonly ITaskQueue _queue;');
    expect(CORE_GRAPH_EDGE_TYPES).toEqual(createCoreGraphEdgeTypes());
  });
});
