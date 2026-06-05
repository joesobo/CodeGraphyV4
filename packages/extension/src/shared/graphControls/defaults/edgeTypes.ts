import type { IGraphEdgeTypeDefinition } from '../contracts';

export const STRUCTURAL_NESTS_EDGE_KIND = 'nests' as const;

export function createCoreGraphEdgeTypes(): IGraphEdgeTypeDefinition[] {
  return [
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
      id: 'test',
      label: 'Tests',
      defaultColor: '#EF4444',
      defaultVisible: false,
    },
    {
      id: 'reexport',
      label: 'Re-exports',
      defaultColor: '#A78BFA',
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
      id: STRUCTURAL_NESTS_EDGE_KIND,
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
  ];
}

export const CORE_GRAPH_EDGE_TYPES: IGraphEdgeTypeDefinition[] = createCoreGraphEdgeTypes();
