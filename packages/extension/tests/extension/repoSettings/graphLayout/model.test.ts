import { describe, expect, it } from 'vitest';
import {
  clearGraphLayoutNodePin,
  createDefaultGraphLayoutSettings,
  normalizeGraphLayoutSettings,
  setGraphLayoutNodePin,
} from '../../../../src/extension/repoSettings/graphLayout/model';

describe('extension/repoSettings/graphLayout/model', () => {
  it('creates empty layout state for pinned nodes', () => {
    expect(createDefaultGraphLayoutSettings()).toEqual({
      pinnedNodes: {},
    });
  });

  it('keeps dormant pin records without requiring visible graph nodes', () => {
    expect(normalizeGraphLayoutSettings({
      pinnedNodes: {
        'src/missing.ts': {
          nodeId: 'src/missing.ts',
          twoDimensional: { x: 120, y: -40 },
          threeDimensional: { x: 12, y: 24, z: -6 },
          updatedAt: '2026-05-07T08:00:00.000Z',
        },
      },
      stray: true,
    })).toEqual({
      pinnedNodes: {
        'src/missing.ts': {
          nodeId: 'src/missing.ts',
          twoDimensional: { x: 120, y: -40 },
          threeDimensional: { x: 12, y: 24, z: -6 },
          updatedAt: '2026-05-07T08:00:00.000Z',
        },
      },
    });
  });

  it('normalizes malformed pin records before settings are persisted', () => {
    expect(normalizeGraphLayoutSettings({
      pinnedNodes: {
        good: {
          nodeId: 'good',
          twoDimensional: { x: 1, y: 2 },
          threeDimensional: { x: 3, y: 4, z: 5 },
          updatedAt: '2026-05-07T08:00:00.000Z',
        },
        mismatch: {
          nodeId: 'other-id',
          twoDimensional: { x: 1, y: 2 },
          updatedAt: '2026-05-07T08:00:00.000Z',
        },
        invalidCoordinate: {
          nodeId: 'invalidCoordinate',
          twoDimensional: { x: Number.POSITIVE_INFINITY, y: 2 },
          updatedAt: '2026-05-07T08:00:00.000Z',
        },
        noCoordinates: {
          nodeId: 'noCoordinates',
          updatedAt: '2026-05-07T08:00:00.000Z',
        },
      },
    })).toEqual({
      pinnedNodes: {
        good: {
          nodeId: 'good',
          twoDimensional: { x: 1, y: 2 },
          threeDimensional: { x: 3, y: 4, z: 5 },
          updatedAt: '2026-05-07T08:00:00.000Z',
        },
      },
    });
  });

  it('sets and clears 2D and 3D pins independently', () => {
    const pinned2d = setGraphLayoutNodePin(createDefaultGraphLayoutSettings(), {
      graphMode: '2d',
      nodeId: 'src/app.ts',
      position: { x: 10, y: 20 },
      updatedAt: '2026-05-07T08:00:00.000Z',
    });
    const pinnedBoth = setGraphLayoutNodePin(pinned2d, {
      graphMode: '3d',
      nodeId: 'src/app.ts',
      position: { x: 1, y: 2, z: 3 },
      updatedAt: '2026-05-07T08:01:00.000Z',
    });
    const only3d = clearGraphLayoutNodePin(pinnedBoth, 'src/app.ts', '2d');
    const cleared = clearGraphLayoutNodePin(only3d, 'src/app.ts', '3d');

    expect(pinnedBoth.pinnedNodes['src/app.ts']).toEqual({
      nodeId: 'src/app.ts',
      twoDimensional: { x: 10, y: 20 },
      threeDimensional: { x: 1, y: 2, z: 3 },
      updatedAt: '2026-05-07T08:01:00.000Z',
    });
    expect(only3d.pinnedNodes['src/app.ts']).toEqual({
      nodeId: 'src/app.ts',
      threeDimensional: { x: 1, y: 2, z: 3 },
      updatedAt: '2026-05-07T08:01:00.000Z',
    });
    expect(cleared.pinnedNodes).toEqual({});
  });
});
