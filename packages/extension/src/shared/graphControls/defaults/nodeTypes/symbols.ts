import type { IGraphNodeTypeDefinition } from '../../contracts';

export function createSymbolGraphNodeTypes(): IGraphNodeTypeDefinition[] {
  return [
    {
      id: 'symbol',
      label: 'Symbol',
      defaultColor: '#7C3AED',
      defaultVisible: false,
      description: {
        description: 'Named code elements inside files, such as functions, classes, interfaces, and types.',
        examples: [{ code: 'export function loadGraph() {}' }],
      },
    },
    {
      id: 'symbol:function',
      label: 'Function',
      defaultColor: '#8B5CF6',
      defaultVisible: false,
      parentId: 'symbol',
      matchSymbolKinds: ['function', 'method'],
      description: {
        description: 'Callable code blocks such as functions, methods, or procedures.',
        examples: [{ code: 'function parseSettings() {}' }],
      },
    },
    {
      id: 'symbol:class',
      label: 'Class',
      defaultColor: '#3B82F6',
      defaultVisible: false,
      parentId: 'symbol',
      description: {
        description: 'Class declarations that group state and behavior.',
        examples: [{ code: 'class GraphRuntime {}' }],
      },
    },
    {
      id: 'symbol:interface',
      label: 'Interface',
      defaultColor: '#06B6D4',
      defaultVisible: false,
      parentId: 'symbol',
      description: {
        description: 'Interface declarations that describe a shape or contract.',
        examples: [{ code: 'interface GraphNode { id: string; }' }],
      },
    },
    {
      id: 'symbol:type',
      label: 'Type',
      defaultColor: '#EC4899',
      defaultVisible: false,
      parentId: 'symbol',
      description: {
        description: 'Type aliases and named type definitions.',
        examples: [{ code: 'type GraphMode = "2d" | "3d";' }],
      },
    },
    {
      id: 'symbol:struct',
      label: 'Struct',
      defaultColor: '#0EA5E9',
      defaultVisible: false,
      parentId: 'symbol',
      description: {
        description: 'Struct declarations that define grouped fields or data.',
        examples: [{ code: 'struct GraphNode { id: String }' }],
      },
    },
    {
      id: 'symbol:enum',
      label: 'Enum',
      defaultColor: '#F59E0B',
      defaultVisible: false,
      parentId: 'symbol',
      description: {
        description: 'Enum declarations that define a named set of values.',
        examples: [{ code: 'enum GraphMode { TwoD, ThreeD }' }],
      },
    },
  ];
}
