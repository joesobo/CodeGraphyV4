import { describe, expect, it } from 'vitest';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../../../../src/shared/graphControls/defaults/definitions';
import { captureGraphControlsSnapshot } from '../../../../../src/extension/graphView/controls/send';

describe('extension/graphView/controls/snapshot', () => {
  it('shows only structural node types before node capabilities are known', () => {
    const snapshot = captureGraphControlsSnapshot(
      {
        get: <T>(_key: string, defaultValue: T): T => defaultValue,
      },
      {
        nodes: [
          { id: 'src/App.ts', label: 'App', color: '#111111', nodeType: 'file' },
        ],
        edges: [],
      },
      [],
      [],
      { nodeTypes: [], edgeTypes: [] },
    );

    expect(snapshot.nodeTypes.map((nodeType) => nodeType.id)).toEqual([
      'file',
      'folder',
      'package',
    ]);
    expect(snapshot.nodeVisibility).toEqual({
      file: true,
      folder: false,
      package: false,
    });
  });

  it('shows symbol parent rows only when declared child node capabilities are relevant', () => {
    const snapshot = captureGraphControlsSnapshot(
      {
        get: <T>(key: string, defaultValue: T): T => {
          if (key === 'nodeVisibility') {
            return {
              symbol: true,
              'symbol:function': true,
              'symbol:class': true,
              'symbol:interface': true,
              variable: true,
              'symbol:constant': true,
            } as T;
          }
          return defaultValue;
        },
      },
      {
        nodes: [
          { id: 'src/app.c', label: 'app.c', color: '#111111', nodeType: 'file' },
        ],
        edges: [],
      },
      [],
      [],
      {
        nodeTypes: ['symbol:function', 'symbol:struct', 'symbol:enum', 'symbol:constant'],
        edgeTypes: [],
      },
    );

    expect(snapshot.nodeTypes.map((nodeType) => nodeType.id)).toEqual([
      'file',
      'folder',
      'package',
      'symbol',
      'symbol:function',
      'symbol:struct',
      'symbol:enum',
      'variable',
      'symbol:constant',
    ]);
    expect(snapshot.nodeVisibility).toEqual({
      file: true,
      folder: false,
      package: false,
      symbol: true,
      'symbol:function': true,
      'symbol:struct': false,
      'symbol:enum': false,
      variable: true,
      'symbol:constant': true,
    });
  });

  it('preserves hidden node capability settings without showing irrelevant rows', () => {
    const snapshot = captureGraphControlsSnapshot(
      {
        get: <T>(key: string, defaultValue: T): T => {
          if (key === 'nodeVisibility') {
            return {
              'symbol:class': true,
              'symbol:interface': true,
            } as T;
          }
          if (key === 'nodeColors') {
            return {
              'symbol:class': '#123456',
            } as T;
          }
          return defaultValue;
        },
      },
      {
        nodes: [
          { id: 'src/app.c', label: 'app.c', color: '#111111', nodeType: 'file' },
        ],
        edges: [],
      },
      [],
      [],
      { nodeTypes: ['symbol:function'], edgeTypes: [] },
    );

    expect(snapshot.nodeTypes.map((nodeType) => nodeType.id)).toEqual([
      'file',
      'folder',
      'package',
      'symbol',
      'symbol:function',
    ]);
    expect(snapshot.nodeVisibility).not.toHaveProperty('symbol:class');
    expect(snapshot.nodeVisibility).not.toHaveProperty('symbol:interface');
    expect(snapshot.nodeColors).not.toHaveProperty('symbol:class');
  });

  it('shows only C-relevant symbol and variable child rows from C node capabilities', () => {
    const snapshot = captureGraphControlsSnapshot(
      {
        get: <T>(key: string, defaultValue: T): T => {
          if (key === 'nodeVisibility') {
            return {
              symbol: true,
              'symbol:function': true,
              'symbol:prototype': true,
              'symbol:type': true,
              variable: true,
              'symbol:constant': true,
              'symbol:global': true,
              'plugin:codegraphy.gdscript:symbol:godot-class-name': true,
            } as T;
          }
          return defaultValue;
        },
      },
      {
        nodes: [
          { id: 'src/main.c', label: 'main.c', color: '#111111', nodeType: 'file' },
        ],
        edges: [],
      },
      [],
      [],
      {
        nodeTypes: [
          'symbol:function',
          'symbol:prototype',
          'symbol:struct',
          'symbol:union',
          'symbol:enum',
          'symbol:typedef',
          'symbol:global',
        ],
        edgeTypes: ['include', 'call', 'contains'],
      },
    );

    expect(snapshot.nodeTypes.map((nodeType) => nodeType.id)).toEqual([
      'file',
      'folder',
      'package',
      'symbol',
      'symbol:function',
      'symbol:prototype',
      'symbol:struct',
      'symbol:union',
      'symbol:enum',
      'symbol:typedef',
      'variable',
      'symbol:global',
    ]);
    expect(snapshot.nodeVisibility).toEqual({
      file: true,
      folder: false,
      package: false,
      symbol: true,
      'symbol:function': true,
      'symbol:prototype': true,
      'symbol:struct': false,
      'symbol:union': false,
      'symbol:enum': false,
      'symbol:typedef': false,
      variable: true,
      'symbol:global': true,
    });
    expect(snapshot.nodeVisibility).not.toHaveProperty('symbol:type');
    expect(snapshot.nodeVisibility).not.toHaveProperty('symbol:constant');
    expect(snapshot.nodeVisibility).not.toHaveProperty('plugin:codegraphy.gdscript:symbol:godot-class-name');
  });

  it('advertises edge capabilities even when the current graph has no matching edges', () => {
    const snapshot = captureGraphControlsSnapshot(
      {
        get: <T>(key: string, defaultValue: T): T => {
          if (key === 'edgeVisibility') {
            return { import: false, 'plugin:route': false, overrides: true } as T;
          }
          return defaultValue;
        },
      },
      {
        nodes: [
          { id: 'src/App.ts', label: 'App', color: '#111111', nodeType: 'file' },
        ],
        edges: [],
      },
      [],
      [
        {
          id: 'plugin:route',
          label: 'Route Links',
          defaultColor: '#10B981',
          defaultVisible: true,
        },
      ],
      { nodeTypes: [], edgeTypes: ['import', 'plugin:route'] },
    );

    expect(snapshot.edgeTypes.map((edgeType) => edgeType.id)).toEqual([
      'import',
      'reference',
      STRUCTURAL_NESTS_EDGE_KIND,
      'plugin:route',
    ]);
    expect(snapshot.edgeVisibility).toEqual({
      import: false,
      reference: false,
      [STRUCTURAL_NESTS_EDGE_KIND]: true,
      'plugin:route': false,
    });
  });

  it('uses the generic reference row for Unity references', () => {
    const snapshot = captureGraphControlsSnapshot(
      {
        get: <T>(key: string, defaultValue: T): T => {
          if (key === 'edgeVisibility') {
            return { reference: false } as T;
          }
          return defaultValue;
        },
      },
      {
        nodes: [
          { id: 'Assets/Scenes/SampleScene.unity', label: 'SampleScene', color: '#111111', nodeType: 'file' },
        ],
        edges: [],
      },
      [],
      [],
      { nodeTypes: [], edgeTypes: ['reference'] },
    );

    expect(snapshot.edgeTypes.map((edgeType) => edgeType.id)).not.toContain('plugin:codegraphy.unity:reference');
    expect(snapshot.edgeVisibility.reference).toBe(false);
  });

  it('advertises only edge types available in the current project graph', () => {
    const snapshot = captureGraphControlsSnapshot(
      {
        get: <T>(key: string, defaultValue: T): T => {
          if (key === 'edgeVisibility') {
            return { import: false, inherit: true, overrides: true } as T;
          }
          return defaultValue;
        },
      },
      {
        nodes: [
          { id: 'src/App.ts', label: 'App', color: '#111111', nodeType: 'file' },
          { id: 'src/model.ts', label: 'Model', color: '#222222', nodeType: 'file' },
        ],
        edges: [
          { id: 'src/App.ts->src/model.ts#import', from: 'src/App.ts', to: 'src/model.ts', kind: 'import', sources: [] },
        ],
      },
      [],
      [],
    );

    expect(snapshot.edgeTypes.map((edgeType) => edgeType.id)).toEqual([
      'import',
      'reference',
      STRUCTURAL_NESTS_EDGE_KIND,
    ]);
    expect(snapshot.edgeVisibility).toEqual({
      import: false,
      reference: false,
      [STRUCTURAL_NESTS_EDGE_KIND]: true,
    });
  });

  it('does not add the legacy References row for C++ graph scope capabilities', () => {
    const snapshot = captureGraphControlsSnapshot(
      {
        get: <T>(_key: string, defaultValue: T): T => defaultValue,
      },
      {
        nodes: [
          { id: 'src/app.cpp', label: 'app.cpp', color: '#111111', nodeType: 'file' },
          { id: 'src/worker.hpp', label: 'worker.hpp', color: '#222222', nodeType: 'file' },
        ],
        edges: [
          { id: 'src/app.cpp->src/worker.hpp#include', from: 'src/app.cpp', to: 'src/worker.hpp', kind: 'include', sources: [] },
        ],
      },
      [],
      [],
      { nodeTypes: [], edgeTypes: ['include', 'call', 'contains', 'inherit', 'overrides'] },
    );

    expect(snapshot.edgeTypes.map((edgeType) => edgeType.id)).toEqual([
      'include',
      'call',
      'inherit',
      STRUCTURAL_NESTS_EDGE_KIND,
      'contains',
      'overrides',
    ]);
  });

  it('does not add the legacy References row when type edges are explicitly supported', () => {
    const snapshot = captureGraphControlsSnapshot(
      {
        get: <T>(_key: string, defaultValue: T): T => defaultValue,
      },
      {
        nodes: [
          { id: 'src/Program.cs', label: 'Program.cs', color: '#111111', nodeType: 'file' },
          { id: 'src/Models/TaskItem.cs', label: 'TaskItem.cs', color: '#222222', nodeType: 'file' },
        ],
        edges: [
          {
            id: 'src/Program.cs->src/Models/TaskItem.cs#type',
            from: 'src/Program.cs',
            to: 'src/Models/TaskItem.cs',
            kind: 'type',
            sources: [],
          },
        ],
      },
      [],
      [],
      { nodeTypes: [], edgeTypes: ['using', 'type', 'call', 'inherit', 'implements', 'contains'] },
    );

    expect(snapshot.edgeTypes.map((edgeType) => edgeType.id)).toEqual([
      'using',
      'type',
      'call',
      'inherit',
      'implements',
      STRUCTURAL_NESTS_EDGE_KIND,
      'contains',
    ]);
  });

  it('does not infer the legacy References row from indexed C++ edges', () => {
    const snapshot = captureGraphControlsSnapshot(
      {
        get: <T>(_key: string, defaultValue: T): T => defaultValue,
      },
      {
        nodes: [
          { id: 'src/app.cpp', label: 'app.cpp', color: '#111111', nodeType: 'file' },
          { id: 'src/worker.hpp', label: 'worker.hpp', color: '#222222', nodeType: 'file' },
          { id: 'src/worker.hpp#ConsoleWorker:class', label: 'ConsoleWorker', color: '#333333', nodeType: 'symbol' },
          { id: 'src/worker.hpp#Worker::execute:method', label: 'Worker::execute', color: '#444444', nodeType: 'symbol' },
        ],
        edges: [
          { id: 'src/app.cpp->src/worker.hpp#include', from: 'src/app.cpp', to: 'src/worker.hpp', kind: 'include', sources: [] },
          {
            id: 'src/worker.hpp#ConsoleWorker:class->src/worker.hpp#Worker::execute:method#overrides',
            from: 'src/worker.hpp#ConsoleWorker:class',
            to: 'src/worker.hpp#Worker::execute:method',
            kind: 'overrides',
            sources: [],
          },
        ],
      },
      [],
      [],
      { nodeTypes: [], edgeTypes: [] },
    );

    expect(snapshot.edgeTypes.map((edgeType) => edgeType.id)).toEqual([
      'include',
      STRUCTURAL_NESTS_EDGE_KIND,
      'overrides',
    ]);
  });

  it('merges core and plugin graph control definitions with stored settings overrides', () => {
    const snapshot = captureGraphControlsSnapshot(
      {
        get: <T>(key: string, defaultValue: T): T => {
          if (key === 'nodeVisibility') {
            return { file: true, folder: true, route: false } as T;
          }
          if (key === 'nodeColors') {
            return { file: '#abcdef', route: '#123456' } as T;
          }
          if (key === 'edgeVisibility') {
            return { import: true, 'plugin:route': false } as T;
          }
          return defaultValue;
        },
      },
      {
        nodes: [
          { id: 'src/App.ts', label: 'App', color: '#111111', nodeType: 'file' },
          { id: 'src', label: 'src', color: '#222222', nodeType: 'folder' },
          { id: 'app:route', label: 'Route', color: '#333333', nodeType: 'route' },
        ],
        edges: [
          { id: 'src/App.ts->pkg:docs#import', from: 'src/App.ts', to: 'pkg:docs', kind: 'import', sources: [] },
          { id: 'src->src/App.ts#custom:route', from: 'src', to: 'src/App.ts', kind: 'custom:route', sources: [] },
        ],
      },
      [
        {
          id: 'route',
          label: 'Routes',
          defaultColor: '#22C55E',
          defaultVisible: true,
          description: {
            description: 'Application routes exposed by a framework.',
            examples: [{ label: 'SvelteKit', code: 'src/routes/+page.svelte' }],
          },
        },
      ],
      [
        {
          id: 'plugin:route',
          label: 'Route Links',
          defaultColor: '#10B981',
          defaultVisible: true,
          description: {
            description: 'A route points at the file that renders it.',
            examples: [{ label: 'SvelteKit', code: 'src/routes/+page.svelte' }],
          },
        },
      ],
      { nodeTypes: ['route'], edgeTypes: ['plugin:route'] },
    );

    expect(snapshot.nodeTypes.map((nodeType) => nodeType.id)).toEqual([
      'file',
      'folder',
      'package',
      'route',
    ]);
    expect(snapshot.edgeTypes.some(edgeType => edgeType.id === STRUCTURAL_NESTS_EDGE_KIND)).toBe(true);
    expect(snapshot.edgeTypes.some(edgeType => edgeType.id === 'custom:route')).toBe(true);
    expect(snapshot.edgeTypes.some(edgeType => edgeType.id === 'plugin:route')).toBe(true);
    expect(snapshot.nodeTypes.find((nodeType) => nodeType.id === 'route')?.description).toEqual({
      description: 'Application routes exposed by a framework.',
      examples: [{ label: 'SvelteKit', code: 'src/routes/+page.svelte' }],
    });
    expect(snapshot.edgeTypes.find((edgeType) => edgeType.id === 'plugin:route')?.description).toEqual({
      description: 'A route points at the file that renders it.',
      examples: [{ label: 'SvelteKit', code: 'src/routes/+page.svelte' }],
    });
    expect(snapshot.nodeColors).toEqual({
      file: '#ABCDEF',
      folder: '#A1A1AA',
      package: '#F59E0B',
      route: '#123456',
    });
    expect(snapshot.nodeVisibility).toEqual({
      file: true,
      folder: true,
      package: false,
      route: false,
    });
    expect(snapshot.edgeVisibility).toEqual(expect.objectContaining({
      import: true,
      'plugin:route': false,
      [STRUCTURAL_NESTS_EDGE_KIND]: true,
      'custom:route': true,
    }));
  });

  it('drops invalid visibility and color values while keeping defaults intact', () => {
    const snapshot = captureGraphControlsSnapshot(
      {
        get: <T>(key: string, defaultValue: T): T => {
          if (key === 'nodeVisibility') {
            return { file: true, folder: 'yes' } as T;
          }
          if (key === 'nodeColors') {
            return { file: 'bad-color' } as T;
          }
          return defaultValue;
        },
      },
      {
        nodes: [{ id: 'src/App.ts', label: 'App', color: '#111111', nodeType: 'file' }],
        edges: [{ id: 'src/App.ts->pkg:docs#import', from: 'src/App.ts', to: 'pkg:docs', kind: 'import', sources: [] }],
      },
      [],
      [],
      { nodeTypes: [], edgeTypes: [] },
    );

    expect(snapshot.nodeColors.file).toBe('#A1A1AA');
    expect(snapshot.nodeVisibility).toEqual({
      file: true,
      folder: false,
      package: false,
    });
    expect(snapshot.edgeTypes.map((edgeType) => edgeType.id)).toContain('import');
    expect(snapshot.edgeVisibility.import).toBe(true);
    expect(snapshot.edgeVisibility[STRUCTURAL_NESTS_EDGE_KIND]).toBe(true);
  });
});
