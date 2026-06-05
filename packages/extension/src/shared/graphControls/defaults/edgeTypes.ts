import type { IGraphEdgeTypeDefinition } from '../contracts';

export const STRUCTURAL_NESTS_EDGE_KIND = 'nests' as const;

export function createCoreGraphEdgeTypes(): IGraphEdgeTypeDefinition[] {
  return [
    {
      id: 'import',
      label: 'Imports',
      defaultColor: '#60A5FA',
      defaultVisible: true,
      description: {
        description: 'One file uses exports from another file or package.',
        examples: [{ label: 'TypeScript', code: 'import { Button } from "./Button";' }],
      },
    },
    {
      id: 'reference',
      label: 'References',
      defaultColor: '#F97316',
      defaultVisible: false,
      description: {
        description: 'One symbol or file mentions another symbol without necessarily calling it.',
        examples: [{ label: 'TypeScript', code: 'const selected: GraphNode = node;' }],
      },
    },
    {
      id: 'call',
      label: 'Calls',
      defaultColor: '#22C55E',
      defaultVisible: false,
      description: {
        description: 'One function, method, or code path invokes another callable symbol.',
        examples: [{ label: 'TypeScript', code: 'renderGraph(scope);' }],
      },
    },
    {
      id: 'test',
      label: 'Tests',
      defaultColor: '#EF4444',
      defaultVisible: false,
      description: {
        description: 'A test file or test symbol verifies behavior from another file or symbol.',
        examples: [{ label: 'Vitest', code: "import { buildScope } from './scope';" }],
      },
    },
    {
      id: 'reexport',
      label: 'Re-exports',
      defaultColor: '#A78BFA',
      defaultVisible: false,
      description: {
        description: 'One file forwards exports from another file or package.',
        examples: [{ label: 'TypeScript', code: 'export { Button } from "./Button";' }],
      },
    },
    {
      id: 'type-import',
      label: 'Type imports',
      defaultColor: '#38BDF8',
      defaultVisible: false,
      description: {
        description: 'One file uses types from another file without pulling in runtime code.',
        examples: [{ label: 'TypeScript', code: 'import type { GraphNode } from "./types";' }],
      },
    },
    {
      id: 'inherit',
      label: 'Inherits',
      defaultColor: '#F59E0B',
      defaultVisible: false,
      description: {
        description: 'One type extends, implements, or derives behavior from another type.',
        examples: [{ label: 'Java', code: 'class Runner extends BaseRunner {}' }],
      },
    },
    {
      id: 'load',
      label: 'Loads',
      defaultColor: '#06B6D4',
      defaultVisible: false,
      description: {
        description: 'One file loads another file or resource at runtime.',
        examples: [{ label: 'GDScript', code: 'const Scene = preload("res://ui/menu.tscn")' }],
      },
    },
    {
      id: STRUCTURAL_NESTS_EDGE_KIND,
      label: 'Nests',
      defaultColor: '#64748B',
      defaultVisible: false,
      description: {
        description: 'A folder or package contains another folder, package, or file.',
        examples: [{ code: 'src/ contains src/index.ts' }],
      },
    },
    {
      id: 'contains',
      label: 'Contains',
      defaultColor: '#94A3B8',
      defaultVisible: false,
      description: {
        description: 'A file or code container includes a symbol inside it.',
        examples: [{ code: 'settings.ts contains buildSettings()' }],
      },
    },
    {
      id: 'overrides',
      label: 'Overrides',
      defaultColor: '#EC4899',
      defaultVisible: false,
      description: {
        description: 'One method or member replaces behavior defined by a parent type.',
        examples: [{ label: 'Java', code: '@Override\npublic void run() {}' }],
      },
    },
  ];
}

export const CORE_GRAPH_EDGE_TYPES: IGraphEdgeTypeDefinition[] = createCoreGraphEdgeTypes();
