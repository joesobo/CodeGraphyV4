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
          imageUrl: 'https://example.test/favorite.png',
        },
      ],
      nodeSizes: new Map([
        ['focus.ts', 16],
        ['favorite.ts', 18],
      ]),
      theme: 'light',
      favorites: new Set(['favorite.ts']),
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
      nodeSizes: new Map([['src', 16]]),
      theme: 'light',
      favorites: new Set(),
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

  it('leaves newly visible nodes unpositioned', () => {
    const nodes = buildGraphNodes({
      nodes: [
        { id: 'src/logger/logger.c', label: 'logger.c', color: '#93C5FD' },
        { id: 'src/logger/logger.c#logger_write:function', label: 'logger_write', color: '#8B5CF6' },
      ],
      nodeSizes: new Map([
        ['src/logger/logger.c', 16],
        ['src/logger/logger.c#logger_write:function', 16],
      ]),
      theme: 'dark',
      favorites: new Set(),
      previousNodes: [
        { id: 'src/logger/logger.c', x: 100, y: 200 } satisfies Pick<FGNode, 'id' | 'x' | 'y'>,
      ],
    });

    expect(nodes.find(node => node.id === 'src/logger/logger.c')).toMatchObject({ x: 100, y: 200 });
    expect(nodes.find(node => node.id === 'src/logger/logger.c#logger_write:function')).toMatchObject({
      x: undefined,
      y: undefined,
    });
  });

  it('preserves previous physics state', () => {
    const nodes = buildGraphNodes({
      nodes: [
        { id: 'survives.ts', label: 'survives.ts', color: '#93C5FD' },
        { id: 'new.ts', label: 'new.ts', color: '#67E8F9' },
      ],
      nodeSizes: new Map([
        ['survives.ts', 16],
        ['new.ts', 16],
      ]),
      theme: 'dark',
      favorites: new Set(),
      previousNodes: [
        {
          id: 'survives.ts',
          x: 100,
          y: 200,
          vx: 1,
          vy: 2,
        } satisfies Pick<FGNode, 'id' | 'vx' | 'vy' | 'x' | 'y'>,
      ],
    });

    expect(nodes.find(node => node.id === 'survives.ts')).toMatchObject({
      vx: 1,
      vy: 2,
      x: 100,
      y: 200,
    });
    expect(nodes.find(node => node.id === 'new.ts')).toMatchObject({
      x: undefined,
      y: undefined,
    });
  });

  it('starts gitignored filesystem nodes with subdued opacity and muted color', () => {
    const nodes = buildGraphNodes({
      nodes: [
        {
          id: 'generated/output.ts',
          label: 'output.ts',
          color: '#93C5FD',
          metadata: { gitIgnored: true, gitIgnoredReason: 'Git ignored' },
        },
        {
          id: 'src/app.ts',
          label: 'app.ts',
          color: '#67E8F9',
        },
      ],
      nodeSizes: new Map([
        ['generated/output.ts', 16],
        ['src/app.ts', 16],
      ]),
      theme: 'dark',
      favorites: new Set(),
    });

    expect(nodes.find(node => node.id === 'generated/output.ts')).toMatchObject({
      baseOpacity: 0.45,
      borderColor: '#7689a3',
      color: '#7689a3',
    });
    expect(nodes.find(node => node.id === 'src/app.ts')).toMatchObject({
      baseOpacity: 1,
      color: '#67E8F9',
    });
  });

  it('honors runtime node supplied fixed coordinates over previous physics state', () => {
    const nodes = buildGraphNodes({
      nodes: [
        {
          id: 'runtime-section',
          label: 'Runtime Section',
          color: '#60a5fa',
          fx: 25,
          fy: 35,
          vx: 0,
          vy: 0,
          x: 25,
          y: 35,
        } as never,
      ],
      nodeSizes: new Map([['runtime-section', 16]]),
      theme: 'dark',
      favorites: new Set(),
      previousNodes: [
        {
          id: 'runtime-section',
          fx: 100,
          fy: 200,
          vx: 8,
          vy: 9,
          x: 100,
          y: 200,
        } satisfies Pick<FGNode, 'fx' | 'fy' | 'id' | 'vx' | 'vy' | 'x' | 'y'>,
      ],
    });

    expect(nodes.find(node => node.id === 'runtime-section')).toMatchObject({
      fx: 25,
      fy: 35,
      vx: 0,
      vy: 0,
      x: 25,
      y: 35,
    });
  });

});
