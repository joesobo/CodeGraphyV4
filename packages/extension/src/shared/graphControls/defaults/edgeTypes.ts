import type { IGraphEdgeTypeDefinition } from '../contracts';

export const STRUCTURAL_NESTS_EDGE_KIND = 'nests' as const;

export function createCoreGraphEdgeTypes(): IGraphEdgeTypeDefinition[] {
  return [
    {
      id: 'include',
      label: 'Include',
      defaultColor: '#38BDF8',
      defaultVisible: true,
      description: {
        description: 'Shows files that include another local source or header file.',
        examples: [{ label: 'C', code: '#include "logger.h"' }],
      },
    },
    {
      id: 'import',
      label: 'Imports',
      defaultColor: '#60A5FA',
      defaultVisible: true,
      description: {
        description: 'Shows source files that depend on exports from another file or package.',
        examples: [{ code: 'import { thing } from "./module";' }],
      },
    },
    {
      id: 'reference',
      label: 'References',
      defaultColor: '#F97316',
      defaultVisible: false,
      description: {
        description: 'Shows symbols or files that mention another symbol without necessarily calling it.',
        examples: [{ code: 'const selected = current;' }],
      },
    },
    {
      id: 'call',
      label: 'Calls',
      defaultColor: '#22C55E',
      defaultVisible: false,
      description: {
        description: 'Shows a function, method, or code path invoking another callable symbol.',
        examples: [{ code: 'runTask();' }],
      },
    },
    {
      id: 'type-import',
      label: 'Type imports',
      defaultColor: '#38BDF8',
      defaultVisible: false,
      description: {
        description: 'Shows type-only relationships that do not pull in runtime code.',
        examples: [{ code: 'import type { Thing } from "./types";' }],
      },
    },
    {
      id: 'inherit',
      label: 'Inherits',
      defaultColor: '#F59E0B',
      defaultVisible: false,
      description: {
        description: 'Shows types that extend, implement, or derive behavior from another type.',
        examples: [{ code: 'class Child extends Parent {}' }],
      },
    },
    {
      id: 'load',
      label: 'Loads',
      defaultColor: '#06B6D4',
      defaultVisible: false,
      description: {
        description: 'Shows runtime loading of another file, module, or resource.',
        examples: [{ code: 'load("path/to/resource")' }],
      },
    },
    {
      id: STRUCTURAL_NESTS_EDGE_KIND,
      label: 'Nests',
      defaultColor: '#64748B',
      defaultVisible: true,
      description: {
        description: 'Shows folder containment around files and nested folders.',
        examples: [{ code: 'src/ contains src/index.ts' }],
      },
    },
    {
      id: 'contains',
      label: 'Contains',
      defaultColor: '#94A3B8',
      defaultVisible: false,
      description: {
        description: 'Shows symbols that live inside a file or another code container.',
        examples: [{ code: 'settings.ts contains buildSettings()' }],
      },
    },
    {
      id: 'overrides',
      label: 'Overrides',
      defaultColor: '#EC4899',
      defaultVisible: false,
      description: {
        description: 'Shows methods or members replacing behavior from a parent type.',
        examples: [{ code: 'override run() {}' }],
      },
    },
    {
      id: 'codegraphy.gdscript:signal-connection',
      label: 'Signal Connections',
      defaultColor: '#EF4444',
      defaultVisible: false,
      description: {
        description: 'Shows Godot signal declarations connected to receiving scripts.',
        examples: [{ label: 'GDScript', code: 'health.health_changed.connect(set_health)' }],
      },
    },
  ];
}

export const CORE_GRAPH_EDGE_TYPES: IGraphEdgeTypeDefinition[] = createCoreGraphEdgeTypes();
