import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../../src/webview/components/graph/model/build';
import { FAVORITE_BORDER_COLOR } from '../../../../../src/webview/components/graph/model/build';
import { DEFAULT_GRAPH_APPEARANCE } from '../../../../../src/webview/components/graph/appearance/model';
import { buildGraphNodes } from '../../../../../src/webview/components/graph/model/node/build';

describe('graph/model/node/build', () => {
  it('applies focused and favorite styling while preserving graph node metadata', () => {
    const nodes = buildGraphNodes({
      appearance: { ...DEFAULT_GRAPH_APPEARANCE, focusBorder: '#2563eb' },
      nodes: [
        {
          id: 'focus.ts',
          label: 'focus.ts',
          color: '#80c0ff',
          depthLevel: 0,
          shape2D: 'circle',
        },
        {
          id: 'favorite.ts',
          label: 'favorite.ts',
          color: '#80c0ff',
          shape3D: 'cube',
          imageUrl: 'https://example.test/favorite.png',
          isCollapsible: true,
          isCollapsed: true,
          collapsedDescendantCount: 12,
        },
      ],
      edges: [],
      nodeSizes: new Map([
        ['focus.ts', 16],
        ['favorite.ts', 18],
      ]),
      theme: 'light',
      favorites: new Set(['favorite.ts']),
      timelineActive: false,
    });

    expect(nodes.find(node => node.id === 'focus.ts')).toMatchObject({
      color: '#5a86b3',
      borderColor: '#2563eb',
      borderWidth: 4,
      baseOpacity: 1,
      shape2D: 'circle',
      size: 20.8,
    });
    expect(nodes.find(node => node.id === 'favorite.ts')).toMatchObject({
      color: '#5a86b3',
      borderColor: FAVORITE_BORDER_COLOR,
      borderWidth: 3,
      imageUrl: 'https://example.test/favorite.png',
      isFavorite: true,
      shape3D: 'cube',
      isCollapsible: true,
      isCollapsed: true,
      collapsedDescendantCount: 12,
      size: 18,
    });
  });

  it('keeps transparent folder icon nodes transparent in light themes', () => {
    const nodes = buildGraphNodes({
      nodes: [
        {
          id: 'src',
          label: 'src',
          color: 'rgba(0, 0, 0, 0)',
          nodeType: 'folder',
          imageUrl: 'https://example.test/folder.svg',
        },
      ],
      edges: [],
      nodeSizes: new Map([['src', 16]]),
      theme: 'light',
      favorites: new Set(),
      timelineActive: false,
    });

    expect(nodes).toEqual([
      expect.objectContaining({
        id: 'src',
        color: 'rgba(0, 0, 0, 0)',
        imageUrl: 'https://example.test/folder.svg',
        nodeType: 'folder',
      }),
    ]);
  });

  it('preserves previous positions and seeds new timeline nodes near connected neighbors', () => {
    const nodes = buildGraphNodes({
      nodes: [
        { id: 'anchor.ts', label: 'anchor.ts', color: '#93C5FD' },
        { id: 'new.ts', label: 'new.ts', color: '#67E8F9' },
      ],
      edges: [{ id: 'anchor.ts->new.ts', from: 'anchor.ts', to: 'new.ts' , kind: 'import', sources: [] }],
      nodeSizes: new Map([
        ['anchor.ts', 16],
        ['new.ts', 16],
      ]),
      theme: 'dark',
      favorites: new Set(),
      timelineActive: true,
      previousNodes: [{ id: 'anchor.ts', x: 100, y: 200 } satisfies Pick<FGNode, 'id' | 'x' | 'y'>],
      random: () => 0.75,
    });

    expect(nodes.find(node => node.id === 'anchor.ts')).toMatchObject({ x: 100, y: 200 });
    expect(nodes.find(node => node.id === 'new.ts')).toMatchObject({ x: 110, y: 210 });
  });

  it('preserves previous physics state outside timeline mode', () => {
    const nodes = buildGraphNodes({
      nodes: [
        { id: 'survives.ts', label: 'survives.ts', color: '#93C5FD' },
        { id: 'new.ts', label: 'new.ts', color: '#67E8F9' },
      ],
      edges: [],
      nodeSizes: new Map([
        ['survives.ts', 16],
        ['new.ts', 16],
      ]),
      theme: 'dark',
      favorites: new Set(),
      timelineActive: false,
      previousNodes: [
        {
          id: 'survives.ts',
          x: 100,
          y: 200,
          z: 300,
          vx: 1,
          vy: 2,
          vz: 3,
        } satisfies Pick<FGNode, 'id' | 'vx' | 'vy' | 'vz' | 'x' | 'y' | 'z'>,
      ],
    });

    expect(nodes.find(node => node.id === 'survives.ts')).toMatchObject({
      vx: 1,
      vy: 2,
      vz: 3,
      x: 100,
      y: 200,
      z: 300,
    });
    expect(nodes.find(node => node.id === 'new.ts')).toMatchObject({
      x: undefined,
      y: undefined,
      z: undefined,
    });
  });

  it('applies active-mode pins as fixed graph-space coordinates', () => {
    const twoDimensionalNodes = buildGraphNodes({
      nodes: [
        { id: 'src/pinned.ts', label: 'pinned.ts', color: '#93C5FD' },
      ],
      edges: [],
      nodeSizes: new Map([['src/pinned.ts', 16]]),
      theme: 'dark',
      favorites: new Set(),
      graphMode: '2d',
      graphLayout: {
        collapsedNodes: {},
        pinnedNodes: {
          'src/pinned.ts': {
            nodeId: 'src/pinned.ts',
            '2D': { x: 40, y: -80 },
            '3D': { x: 1, y: 2, z: 3 },
          },
        },
      },
      timelineActive: false,
    });

    expect(twoDimensionalNodes[0]).toMatchObject({
      fx: 40,
      fy: -80,
      fz: undefined,
      isPinned: true,
      x: 40,
      y: -80,
      z: undefined,
    });

    const threeDimensionalNodes = buildGraphNodes({
      nodes: [
        { id: 'src/pinned.ts', label: 'pinned.ts', color: '#93C5FD' },
      ],
      edges: [],
      nodeSizes: new Map([['src/pinned.ts', 16]]),
      theme: 'dark',
      favorites: new Set(),
      graphMode: '3d',
      graphLayout: {
        collapsedNodes: {},
        pinnedNodes: {
          'src/pinned.ts': {
            nodeId: 'src/pinned.ts',
            '2D': { x: 40, y: -80 },
            '3D': { x: 1, y: 2, z: 3 },
          },
        },
      },
      timelineActive: false,
    });

    expect(threeDimensionalNodes[0]).toMatchObject({
      fx: 1,
      fy: 2,
      fz: 3,
      isPinned: true,
      x: 1,
      y: 2,
      z: 3,
    });
  });

  it('applies pins to collapsed folder nodes without dropping collapse metadata', () => {
    const nodes = buildGraphNodes({
      nodes: [
        {
          id: 'src',
          label: 'src',
          color: '#93C5FD',
          collapsedDescendantCount: 12,
          isCollapsible: true,
          isCollapsed: true,
          nodeType: 'folder',
        },
      ],
      edges: [],
      nodeSizes: new Map([['src', 16]]),
      theme: 'dark',
      favorites: new Set(),
      graphMode: '2d',
      graphLayout: {
        collapsedNodes: { src: true },
        pinnedNodes: {
          src: {
            nodeId: 'src',
            '2D': { x: 40, y: -80 },
          },
        },
      },
      timelineActive: false,
    });

    expect(nodes[0]).toMatchObject({
      collapsedDescendantCount: 12,
      fx: 40,
      fy: -80,
      isCollapsible: true,
      isCollapsed: true,
      isPinned: true,
      nodeType: 'folder',
      x: 40,
      y: -80,
    });
  });

  it('ignores persisted pins while timeline snapshots are active', () => {
    const nodes = buildGraphNodes({
      nodes: [
        { id: 'src/pinned.ts', label: 'pinned.ts', color: '#93C5FD' },
      ],
      edges: [],
      nodeSizes: new Map([['src/pinned.ts', 16]]),
      theme: 'dark',
      favorites: new Set(),
      graphMode: '2d',
      graphLayout: {
        collapsedNodes: {},
        pinnedNodes: {
          'src/pinned.ts': {
            nodeId: 'src/pinned.ts',
            '2D': { x: 40, y: -80 },
          },
        },
      },
      previousNodes: [{ id: 'src/pinned.ts', x: 4, y: 8 }],
      timelineActive: true,
    });

    expect(nodes[0]).toMatchObject({
      fx: undefined,
      fy: undefined,
      isPinned: false,
      x: 4,
      y: 8,
    });
  });
});
