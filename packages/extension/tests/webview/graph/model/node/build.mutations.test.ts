import { describe, it, expect } from 'vitest';
import { DEFAULT_GRAPH_APPEARANCE } from '../../../../../src/webview/components/graph/appearance/model';
import { buildGraphNodes } from '../../../../../src/webview/components/graph/model/node/build';
import { FAVORITE_BORDER_COLOR } from '../../../../../src/webview/components/graph/model/node/display';

describe('buildGraphNodes (mutation targets)', () => {
  it('applies dark theme border color for focused node', () => {
    const nodes = buildGraphNodes({
      appearance: { ...DEFAULT_GRAPH_APPEARANCE, focusBorder: '#60a5fa' },
      nodes: [{ id: 'focus.ts', label: 'focus.ts', color: '#80c0ff', depthLevel: 0 }],
      nodeSizes: new Map([['focus.ts', 16]]),
      theme: 'dark',
      favorites: new Set(),
    });

    const focusNode = nodes.find(n => n.id === 'focus.ts')!;
    expect(focusNode.borderColor).toBe('#60a5fa');
    expect(focusNode.borderWidth).toBe(4);
  });

  it('applies light theme border color for focused node', () => {
    const nodes = buildGraphNodes({
      appearance: { ...DEFAULT_GRAPH_APPEARANCE, focusBorder: '#2563eb' },
      nodes: [{ id: 'focus.ts', label: 'focus.ts', color: '#80c0ff', depthLevel: 0 }],
      nodeSizes: new Map([['focus.ts', 16]]),
      theme: 'light',
      favorites: new Set(),
    });

    expect(nodes[0].borderColor).toBe('#2563eb');
  });

  it('uses FAVORITE_BORDER_COLOR for non-focused favorite node', () => {
    const nodes = buildGraphNodes({
      nodes: [{ id: 'fav.ts', label: 'fav.ts', color: '#80c0ff' }],
      nodeSizes: new Map([['fav.ts', 16]]),
      theme: 'dark',
      favorites: new Set(['fav.ts']),
    });

    expect(nodes[0].borderColor).toBe(FAVORITE_BORDER_COLOR);
    expect(nodes[0].borderWidth).toBe(3);
    expect(nodes[0].isFavorite).toBe(true);
  });

  it('uses raw color as border for non-focused, non-favorite node', () => {
    const nodes = buildGraphNodes({
      nodes: [{ id: 'plain.ts', label: 'plain.ts', color: '#93C5FD' }],
      nodeSizes: new Map([['plain.ts', 16]]),
      theme: 'dark',
      favorites: new Set(),
    });

    expect(nodes[0].borderColor).toBe('#93C5FD');
    expect(nodes[0].borderWidth).toBe(2);
  });

  it('uses default node size when nodeSizes map has no entry', () => {
    const nodes = buildGraphNodes({
      nodes: [{ id: 'missing.ts', label: 'missing.ts', color: '#93C5FD' }],
      nodeSizes: new Map(),
      theme: 'dark',
      favorites: new Set(),
    });

    expect(nodes[0].size).toBe(16);
  });

  it('uses previous positions', () => {
    const nodes = buildGraphNodes({
      nodes: [{ id: 'a.ts', label: 'a.ts', color: '#93C5FD' }],
      nodeSizes: new Map([['a.ts', 16]]),
      theme: 'dark',
      favorites: new Set(),
      previousNodes: [{ id: 'a.ts', x: 100, y: 200 }],
    });

    expect(nodes[0].x).toBe(100);
    expect(nodes[0].y).toBe(200);
  });

  it('preserves node x from source node if set', () => {
    const nodes = buildGraphNodes({
      nodes: [{ id: 'a.ts', label: 'a.ts', color: '#93C5FD', x: 50, y: 60 } as never],
      nodeSizes: new Map([['a.ts', 16]]),
      theme: 'dark',
      favorites: new Set(),
    });

    expect(nodes[0].x).toBe(50);
    expect(nodes[0].y).toBe(60);
  });
});
