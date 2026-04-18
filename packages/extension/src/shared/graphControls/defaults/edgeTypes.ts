import type { IGraphEdgeTypeDefinition } from '../contracts';

export const STRUCTURAL_NESTS_EDGE_KIND = 'codegraphy:nests' as const;

export function createCoreGraphEdgeTypes(): IGraphEdgeTypeDefinition[] {
  return [
    {
      id: STRUCTURAL_NESTS_EDGE_KIND,
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
  ];
}

export const CORE_GRAPH_EDGE_TYPES: IGraphEdgeTypeDefinition[] = createCoreGraphEdgeTypes();
