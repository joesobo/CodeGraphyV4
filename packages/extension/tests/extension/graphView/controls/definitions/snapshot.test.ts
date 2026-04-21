import { describe, expect, it } from 'vitest';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../../../../src/shared/graphControls/defaults/definitions';
import { captureGraphControlsSnapshot } from '../../../../../src/extension/graphView/controls/send';

describe('extension/graphView/controls/snapshot', () => {
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
          if (key === 'nodeColorEnabled') {
            return { file: false, route: true } as T;
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
        },
      ],
      [
        {
          id: 'plugin:route',
          label: 'Route Links',
          defaultColor: '#10B981',
          defaultVisible: true,
        },
      ],
    );

    expect(snapshot.nodeTypes.map(nodeType => nodeType.id)).toEqual(['file', 'folder', 'package', 'route']);
    expect(snapshot.edgeTypes.some(edgeType => edgeType.id === STRUCTURAL_NESTS_EDGE_KIND)).toBe(true);
    expect(snapshot.edgeTypes.some(edgeType => edgeType.id === 'custom:route')).toBe(true);
    expect(snapshot.nodeColors).toEqual({
      file: '#ABCDEF',
      folder: '#A1A1AA',
      package: '#F59E0B',
      route: '#123456',
    });
    expect(snapshot.nodeColorEnabled).toEqual({
      file: false,
      folder: true,
      package: true,
      route: true,
    });
    expect(snapshot.nodeVisibility).toEqual({ file: true, folder: true, package: false, route: false });
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
          if (key === 'nodeColorEnabled') {
            return { file: 'nope' } as T;
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
    expect(snapshot.nodeColorEnabled).toEqual({ file: true, folder: true, package: true });
    expect(snapshot.nodeVisibility).toEqual({ file: true, folder: false, package: false });
    expect(snapshot.edgeTypes.map((edgeType) => edgeType.id)).toContain('import');
    expect(snapshot.edgeVisibility[STRUCTURAL_NESTS_EDGE_KIND]).toBe(true);
  });
});
