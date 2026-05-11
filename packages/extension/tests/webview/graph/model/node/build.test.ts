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
        sections: {},
        ownership: {},
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
        sections: {},
        ownership: {},
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

  it('derives pinned Section Member render positions from direct owner local coordinates', () => {
    const nodes = buildGraphNodes({
      nodes: [
        { id: 'src/member.ts', label: 'member.ts', color: '#93C5FD' },
      ],
      edges: [],
      nodeSizes: new Map([['src/member.ts', 16]]),
      theme: 'dark',
      favorites: new Set(),
      graphMode: '2d',
      graphLayout: {
        collapsedNodes: {},
        pinnedNodes: {
          'src/member.ts': {
            nodeId: 'src/member.ts',
            '2D': { x: 20, y: 30 },
          },
        },
        sections: {
          'section-1': {
            id: 'section-1',
            label: 'Section',
            color: '#60a5fa',
            x: 100,
            y: 50,
            width: 200,
            height: 160,
            collapsed: false,
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
        },
        ownership: {
          'src/member.ts': {
            itemId: 'src/member.ts',
            itemKind: 'node',
            ownerSectionId: 'section-1',
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
        },
      },
      timelineActive: false,
    });

    expect(nodes[0]).toMatchObject({
      fx: 120,
      fy: 80,
      x: 120,
      y: 80,
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
        sections: {},
        ownership: {},
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

  it('adds expanded Graph Sections as 2D Section Nodes and marks owned members', () => {
    const nodes = buildGraphNodes({
      nodes: [
        { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
      ],
      edges: [],
      nodeSizes: new Map([['src/app.ts', 16]]),
      theme: 'dark',
      favorites: new Set(),
      graphMode: '2d',
      graphLayout: {
        collapsedNodes: {},
        pinnedNodes: {},
        sections: {
          'section-1': {
            id: 'section-1',
            label: 'UI Layer',
            icon: 'TS',
            color: '#60a5fa',
            x: -120,
            y: -80,
            width: 300,
            height: 220,
            collapsed: false,
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
        },
        ownership: {
          'section-1': {
            itemId: 'section-1',
            itemKind: 'section',
            ownerSectionId: null,
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
          'src/app.ts': {
            itemId: 'src/app.ts',
            itemKind: 'node',
            ownerSectionId: 'section-1',
            updatedAt: '2026-05-07T09:01:00.000Z',
          },
        },
      },
      timelineActive: false,
    });

    expect(nodes.find(node => node.id === 'src/app.ts')).toMatchObject({
      ownerSectionId: 'section-1',
    });
    expect(nodes.find(node => node.id === 'section-1')).toMatchObject({
      borderColor: '#60a5fa',
      color: '#60a5fa',
      icon: 'TS',
      isGraphSection: true,
      label: 'UI Layer',
      nodeType: 'graph-section',
      sectionHeight: 220,
      sectionWidth: 300,
      x: 30,
      y: 30,
    });
  });

  it('derives nested Graph Section render positions from direct parent local coordinates', () => {
    const nodes = buildGraphNodes({
      nodes: [],
      edges: [],
      nodeSizes: new Map(),
      theme: 'dark',
      favorites: new Set(),
      graphMode: '2d',
      graphLayout: {
        collapsedNodes: {},
        pinnedNodes: {},
        sections: {
          parent: {
            id: 'parent',
            label: 'Parent',
            color: '#60a5fa',
            x: 100,
            y: 50,
            width: 300,
            height: 200,
            collapsed: false,
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
          child: {
            id: 'child',
            label: 'Child',
            color: '#22c55e',
            x: 40,
            y: 30,
            width: 100,
            height: 80,
            collapsed: false,
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
        },
        ownership: {
          child: {
            itemId: 'child',
            itemKind: 'section',
            ownerSectionId: 'parent',
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
        },
      },
      timelineActive: false,
    });

    expect(nodes.find(node => node.id === 'parent')).toMatchObject({ x: 250, y: 150 });
    expect(nodes.find(node => node.id === 'child')).toMatchObject({ x: 190, y: 120 });
  });

  it('derives pinned nested Graph Section render positions from direct parent local coordinates', () => {
    const nodes = buildGraphNodes({
      nodes: [],
      edges: [],
      nodeSizes: new Map(),
      theme: 'dark',
      favorites: new Set(),
      graphMode: '2d',
      graphLayout: {
        collapsedNodes: {},
        pinnedNodes: {
          child: {
            nodeId: 'child',
            '2D': { x: 60, y: 70 },
          },
        },
        sections: {
          parent: {
            id: 'parent',
            label: 'Parent',
            color: '#60a5fa',
            x: 100,
            y: 50,
            width: 300,
            height: 200,
            collapsed: false,
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
          child: {
            id: 'child',
            label: 'Child',
            color: '#22c55e',
            x: 40,
            y: 30,
            width: 100,
            height: 80,
            collapsed: false,
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
        },
        ownership: {
          child: {
            itemId: 'child',
            itemKind: 'section',
            ownerSectionId: 'parent',
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
        },
      },
      timelineActive: false,
    });

    expect(nodes.find(node => node.id === 'child')).toMatchObject({
      fx: 160,
      fy: 120,
      x: 160,
      y: 120,
    });
  });

  it('preserves previous Graph Section physics state when rebuilding graph nodes', () => {
    const nodes = buildGraphNodes({
      nodes: [],
      edges: [],
      nodeSizes: new Map(),
      theme: 'dark',
      favorites: new Set(),
      graphMode: '2d',
      graphLayout: {
        collapsedNodes: {},
        pinnedNodes: {},
        sections: {
          'section-1': {
            id: 'section-1',
            label: 'UI Layer',
            color: '#60a5fa',
            x: -1200,
            y: 800,
            width: 300,
            height: 220,
            collapsed: false,
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
        },
        ownership: {
          'section-1': {
            itemId: 'section-1',
            itemKind: 'section',
            ownerSectionId: null,
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
        },
      },
      previousNodes: [
        {
          id: 'section-1',
          vx: 3,
          vy: -2,
          x: 40,
          y: -30,
        } satisfies Pick<FGNode, 'id' | 'vx' | 'vy' | 'x' | 'y'>,
      ],
      timelineActive: false,
    });

    expect(nodes.find(node => node.id === 'section-1')).toMatchObject({
      vx: 3,
      vy: -2,
      x: 40,
      y: -30,
    });
  });

  it('does not add Graph Section nodes in 3D or timeline snapshots', () => {
    const graphLayout = {
      collapsedNodes: {},
      pinnedNodes: {},
      sections: {
        'section-1': {
          id: 'section-1',
          label: 'UI Layer',
          color: '#60a5fa',
          x: 0,
          y: 0,
          width: 300,
          height: 220,
          collapsed: false,
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
      },
      ownership: {
        'section-1': {
          itemId: 'section-1',
          itemKind: 'section' as const,
          ownerSectionId: null,
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
      },
    };

    const threeDimensionalNodes = buildGraphNodes({
      nodes: [],
      edges: [],
      nodeSizes: new Map(),
      theme: 'dark',
      favorites: new Set(),
      graphMode: '3d',
      graphLayout,
      timelineActive: false,
    });
    const timelineNodes = buildGraphNodes({
      nodes: [],
      edges: [],
      nodeSizes: new Map(),
      theme: 'dark',
      favorites: new Set(),
      graphMode: '2d',
      graphLayout,
      timelineActive: true,
    });

    expect(threeDimensionalNodes).toEqual([]);
    expect(timelineNodes).toEqual([]);
  });
});
