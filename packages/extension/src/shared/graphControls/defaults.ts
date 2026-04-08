import type {
  IGraphEdgeTypeDefinition,
  IGraphNodeTypeDefinition,
} from './types';
import {
  DEFAULT_FOLDER_NODE_COLOR,
  DEFAULT_NODE_COLOR,
  DEFAULT_PACKAGE_NODE_COLOR,
} from '../fileColors';

export const STRUCTURAL_NESTS_EDGE_KIND = 'codegraphy:nests' as const;

export const CORE_GRAPH_NODE_TYPES: IGraphNodeTypeDefinition[] = [
  {
    id: 'file',
    label: 'Files',
    defaultColor: DEFAULT_NODE_COLOR,
    defaultVisible: true,
  },
  {
    id: 'folder',
    label: 'Folders',
    defaultColor: DEFAULT_FOLDER_NODE_COLOR,
    defaultVisible: false,
  },
  {
    id: 'package',
    label: 'Packages',
    defaultColor: DEFAULT_PACKAGE_NODE_COLOR,
    defaultVisible: false,
  },
];

export const CORE_GRAPH_EDGE_TYPES: IGraphEdgeTypeDefinition[] = [
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

export function createDefaultNodeVisibility(): Record<string, boolean> {
  return Object.fromEntries(
    CORE_GRAPH_NODE_TYPES.map((definition) => [definition.id, definition.defaultVisible]),
  );
}

export function createDefaultNodeColors(): Record<string, string> {
  return Object.fromEntries(
    CORE_GRAPH_NODE_TYPES.map((definition) => [definition.id, definition.defaultColor]),
  );
}

export function createDefaultEdgeVisibility(): Record<string, boolean> {
  return Object.fromEntries(
    CORE_GRAPH_EDGE_TYPES.map((definition) => [definition.id, definition.defaultVisible]),
  );
}

export function createDefaultEdgeColors(): Record<string, string> {
  return Object.fromEntries(
    CORE_GRAPH_EDGE_TYPES.map((definition) => [definition.id, definition.defaultColor]),
  );
}
