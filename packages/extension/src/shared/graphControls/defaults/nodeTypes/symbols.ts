import type { IGraphNodeTypeDefinition } from '../../contracts';

export function createSymbolGraphNodeTypes(): IGraphNodeTypeDefinition[] {
  return [
    {
      id: 'symbol',
      label: 'Symbol',
      defaultColor: '#7C3AED',
      defaultVisible: false,
      description: {
        description: 'Quick toggle for all named code elements inside files.',
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
      id: 'symbol:namespace',
      label: 'Namespace',
      defaultColor: '#64748B',
      defaultVisible: false,
      parentId: 'symbol',
      matchSymbolKinds: ['namespace'],
      description: {
        description: 'Named scopes that group related code declarations.',
        examples: [{ label: 'C++', code: 'namespace taskrunner {}' }],
      },
    },
    {
      id: 'symbol:callable',
      label: 'Callable',
      defaultColor: '#8B5CF6',
      defaultVisible: false,
      parentId: 'symbol',
      matchSymbolKinds: ['function'],
      description: {
        description: 'Free functions and other callable declarations that are not class methods.',
        examples: [{ label: 'C++', code: 'TaskList seed_tasks();' }],
      },
    },
    {
      id: 'symbol:method',
      label: 'Method',
      defaultColor: '#A855F7',
      defaultVisible: false,
      parentId: 'symbol',
      matchSymbolKinds: ['method'],
      description: {
        description: 'Callable members that belong to a class or similar type.',
        examples: [{ label: 'C++', code: 'std::size_t TaskRunner::run() {}' }],
      },
    },
    {
      id: 'symbol:prototype',
      label: 'Prototype',
      defaultColor: '#A78BFA',
      defaultVisible: false,
      parentId: 'symbol',
      matchSymbolKinds: ['prototype'],
      description: {
        description: 'Function declarations without bodies, such as C prototypes.',
        examples: [{ label: 'C', code: 'void logger_flush(Logger *logger);' }],
      },
    },
    {
      id: 'symbol:class',
      label: 'Class',
      defaultColor: '#3B82F6',
      defaultVisible: false,
      parentId: 'symbol',
      matchSymbolKinds: ['class'],
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
      matchSymbolKinds: ['interface'],
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
      matchSymbolKinds: ['type'],
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
      matchSymbolKinds: ['struct'],
      description: {
        description: 'Struct declarations that define grouped fields or data.',
        examples: [{ code: 'struct GraphNode { id: String }' }],
      },
    },
    {
      id: 'symbol:union',
      label: 'Union',
      defaultColor: '#14B8A6',
      defaultVisible: false,
      parentId: 'symbol',
      matchSymbolKinds: ['union'],
      description: {
        description: 'Union declarations that store one of several field layouts in shared storage.',
        examples: [{ label: 'C', code: 'union LogMessage { const char *text; int code; }' }],
      },
    },
    {
      id: 'symbol:enum',
      label: 'Enum',
      defaultColor: '#F59E0B',
      defaultVisible: false,
      parentId: 'symbol',
      matchSymbolKinds: ['enum'],
      description: {
        description: 'Enum declarations that define a named set of values.',
        examples: [{ code: 'enum GraphMode { TwoD, ThreeD }' }],
      },
    },
    {
      id: 'symbol:typedef',
      label: 'Typedef',
      defaultColor: '#F472B6',
      defaultVisible: false,
      parentId: 'symbol',
      matchSymbolKinds: ['typedef'],
      description: {
        description: 'C typedef declarations that introduce an alias for a named type.',
        examples: [{ label: 'C', code: 'typedef struct Logger Logger;' }],
      },
    },
    {
      id: 'symbol:alias',
      label: 'Alias',
      defaultColor: '#F472B6',
      defaultVisible: false,
      parentId: 'symbol',
      matchSymbolKinds: ['alias'],
      description: {
        description: 'Named aliases introduced for another type.',
        examples: [{ label: 'C++', code: 'using TaskId = std::uint64_t;' }],
      },
    },
    {
      id: 'symbol:template',
      label: 'Template',
      defaultColor: '#C084FC',
      defaultVisible: false,
      parentId: 'symbol',
      matchSymbolKinds: ['template'],
      description: {
        description: 'Template declarations that define reusable generic code.',
        examples: [{ label: 'C++', code: 'template <typename Item> class TaskQueue {};' }],
      },
    },
  ];
}
