import { describe, expect, it } from 'vitest';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../../../../src/shared/graphControls/defaults/definitions';
import { captureGraphControlsSnapshot } from '../../../../../src/extension/graphView/controls/send';

describe('extension/graphView/controls/snapshot', () => {
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
      ['import', 'plugin:route'],
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
      [STRUCTURAL_NESTS_EDGE_KIND]: false,
      'plugin:route': false,
    });
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
      [STRUCTURAL_NESTS_EDGE_KIND]: false,
    });
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
      ['plugin:route'],
    );

    expect(snapshot.nodeTypes.map((nodeType) => nodeType.id)).toEqual([
      'file',
      'folder',
      'package',
      'symbol',
      'symbol:function',
      'symbol:class',
      'symbol:interface',
      'symbol:type',
      'symbol:struct',
      'symbol:enum',
      'variable',
      'symbol:constant',
      'plugin:codegraphy.gdscript:symbol:godot-class-name',
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
      symbol: '#7C3AED',
      'symbol:function': '#8B5CF6',
      'symbol:class': '#3B82F6',
      'symbol:interface': '#06B6D4',
      'symbol:type': '#EC4899',
      'symbol:struct': '#0EA5E9',
      'symbol:enum': '#F59E0B',
      variable: '#14B8A6',
      'symbol:constant': '#22C55E',
      'plugin:codegraphy.gdscript:symbol:godot-class-name': '#478CBF',
      route: '#123456',
    });
    expect(snapshot.nodeVisibility).toEqual({
      file: true,
      folder: true,
      package: false,
      symbol: false,
      'symbol:function': false,
      'symbol:class': false,
      'symbol:interface': false,
      'symbol:type': false,
      'symbol:struct': false,
      'symbol:enum': false,
      variable: false,
      'symbol:constant': false,
      'plugin:codegraphy.gdscript:symbol:godot-class-name': false,
      route: false,
    });
    expect(snapshot.edgeVisibility).toEqual(expect.objectContaining({
      import: true,
      [STRUCTURAL_NESTS_EDGE_KIND]: false,
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
    );

    expect(snapshot.nodeColors.file).toBe('#A1A1AA');
    expect(snapshot.nodeVisibility).toEqual({
      file: true,
      folder: false,
      package: false,
      symbol: false,
      'symbol:function': false,
      'symbol:class': false,
      'symbol:interface': false,
      'symbol:type': false,
      'symbol:struct': false,
      'symbol:enum': false,
      variable: false,
      'symbol:constant': false,
      'plugin:codegraphy.gdscript:symbol:godot-class-name': false,
    });
    expect(snapshot.edgeTypes.map((edgeType) => edgeType.id)).toContain('import');
    expect(snapshot.edgeVisibility.import).toBe(true);
    expect(snapshot.edgeVisibility[STRUCTURAL_NESTS_EDGE_KIND]).toBe(false);
  });
});
