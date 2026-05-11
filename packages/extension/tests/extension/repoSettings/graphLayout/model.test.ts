import { describe, expect, it } from 'vitest';
import {
  clearGraphLayoutNodePin,
  createDefaultGraphLayoutSettings,
  normalizeGraphLayoutSettings,
  setGraphLayoutNodeCollapsed,
  setGraphLayoutNodePin,
} from '../../../../src/extension/repoSettings/graphLayout/model';

describe('extension/repoSettings/graphLayout/model', () => {
  it('creates empty layout state for collapsed and pinned nodes', () => {
    expect(createDefaultGraphLayoutSettings()).toEqual({
      collapsedNodes: {},
      pinnedNodes: {},
    });
  });

  it('keeps dormant layout records without requiring visible graph nodes', () => {
    expect(normalizeGraphLayoutSettings({
      collapsedNodes: {
        'src/missing-folder': true,
        bad: 'yes',
      },
      pinnedNodes: {
        'src/missing.ts': {
          nodeId: 'src/missing.ts',
          '2D': { x: 120, y: -40 },
          '3D': { x: 12, y: 24, z: -6 },
        },
      },
      stray: true,
    })).toEqual({
      collapsedNodes: {
        'src/missing-folder': true,
      },
      pinnedNodes: {
        'src/missing.ts': {
          nodeId: 'src/missing.ts',
          '2D': { x: 120, y: -40 },
          '3D': { x: 12, y: 24, z: -6 },
        },
      },
    });
  });

  it('normalizes malformed pin records before settings are persisted', () => {
    expect(normalizeGraphLayoutSettings({
      pinnedNodes: {
        good: {
          nodeId: 'good',
          '2D': { x: 1, y: 2 },
          '3D': { x: 3, y: 4, z: 5 },
        },
        mismatch: {
          nodeId: 'other-id',
          '2D': { x: 1, y: 2 },
        },
        invalidCoordinate: {
          nodeId: 'invalidCoordinate',
          '2D': { x: Number.POSITIVE_INFINITY, y: 2 },
        },
        noCoordinates: {
          nodeId: 'noCoordinates',
        },
      },
    })).toEqual({
      collapsedNodes: {},
      pinnedNodes: {
        good: {
          nodeId: 'good',
          '2D': { x: 1, y: 2 },
          '3D': { x: 3, y: 4, z: 5 },
        },
      },
    });
  });

  it('sets and clears collapsed node state independently of pins', () => {
    const pinned = setGraphLayoutNodePin(createDefaultGraphLayoutSettings(), {
      graphMode: '2d',
      nodeId: 'src/app.ts',
      position: { x: 10, y: 20 },
    });
    const collapsed = setGraphLayoutNodeCollapsed(pinned, 'src', true);
    const expanded = setGraphLayoutNodeCollapsed(collapsed, 'src', false);

    expect(collapsed).toEqual({
      collapsedNodes: { src: true },
      pinnedNodes: pinned.pinnedNodes,
    });
    expect(expanded).toEqual({
      collapsedNodes: {},
      pinnedNodes: pinned.pinnedNodes,
    });
  });

  it('sets and clears 2D and 3D pins independently', () => {
    const pinned2d = setGraphLayoutNodePin(createDefaultGraphLayoutSettings(), {
      graphMode: '2d',
      nodeId: 'src/app.ts',
      position: { x: 10, y: 20 },
    });
    const pinnedBoth = setGraphLayoutNodePin(pinned2d, {
      graphMode: '3d',
      nodeId: 'src/app.ts',
      position: { x: 1, y: 2, z: 3 },
    });
    const only3d = clearGraphLayoutNodePin(pinnedBoth, 'src/app.ts', '2d');
    const cleared = clearGraphLayoutNodePin(only3d, 'src/app.ts', '3d');

    expect(pinnedBoth.pinnedNodes['src/app.ts']).toEqual({
      nodeId: 'src/app.ts',
      '2D': { x: 10, y: 20 },
      '3D': { x: 1, y: 2, z: 3 },
    });
    expect(only3d.pinnedNodes['src/app.ts']).toEqual({
      nodeId: 'src/app.ts',
      '3D': { x: 1, y: 2, z: 3 },
    });
    expect(cleared.pinnedNodes).toEqual({});
    expect(cleared.collapsedNodes).toEqual({});
  });
});
