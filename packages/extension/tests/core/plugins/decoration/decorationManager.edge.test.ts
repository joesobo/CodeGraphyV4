import { describe, expect, it } from 'vitest';
import type { EdgeDecoration } from '../../../../src/core/plugins/decoration/manager';
import { DecorationManager } from '../../../../src/core/plugins/decoration/manager';

describe('DecorationManager edge decorations', () => {
  it('returns the original decoration when only one plugin decorates an edge', () => {
    const manager = new DecorationManager();
    const decoration: EdgeDecoration = { color: '#ff0000', width: 3 };

    manager.decorateEdge('plugin-a', 'a->b', decoration);

    expect(manager.getMergedEdgeDecorations().get('a->b')).toBe(decoration);
  });

  it('removes an edge decoration when its disposable is disposed', () => {
    const manager = new DecorationManager();
    const disposable = manager.decorateEdge('plugin-a', 'a->b', { color: '#ff0000' });

    disposable.dispose();

    expect(manager.getMergedEdgeDecorations().size).toBe(0);
  });

  it('fills missing edge fields from lower-priority decorations', () => {
    const manager = new DecorationManager();

    manager.decorateEdge('plugin-low', 'a->b', {
      color: '#10b981',
      width: 2,
      style: 'dashed',
      label: { text: 'reads', color: '#047857' },
      particles: { count: 4, color: '#34d399', speed: 2 },
      opacity: 0.4,
      curvature: 0.35,
      priority: 0,
    });
    manager.decorateEdge('plugin-high', 'a->b', { priority: 10 });

    expect(manager.getMergedEdgeDecorations().get('a->b')).toEqual({
      color: '#10b981',
      width: 2,
      style: 'dashed',
      label: { text: 'reads', color: '#047857' },
      particles: { count: 4, color: '#34d399', speed: 2 },
      opacity: 0.4,
      curvature: 0.35,
    });
  });

  it('keeps higher-priority edge fields when lower-priority decorations conflict', () => {
    const manager = new DecorationManager();

    manager.decorateEdge('plugin-low', 'a->b', {
      color: '#f97316',
      width: 1,
      style: 'dotted',
      label: { text: 'low', color: '#9a3412' },
      particles: { count: 1, color: '#fb923c', speed: 1 },
      opacity: 0.2,
      curvature: 0.1,
      priority: 0,
    });
    manager.decorateEdge('plugin-high', 'a->b', {
      color: '#2563eb',
      width: 4,
      style: 'solid',
      label: { text: 'high', color: '#1d4ed8' },
      particles: { count: 6, color: '#60a5fa', speed: 3 },
      opacity: 0.9,
      curvature: 0.8,
      priority: 10,
    });

    expect(manager.getMergedEdgeDecorations().get('a->b')).toEqual({
      color: '#2563eb',
      width: 4,
      style: 'solid',
      label: { text: 'high', color: '#1d4ed8' },
      particles: { count: 6, color: '#60a5fa', speed: 3 },
      opacity: 0.9,
      curvature: 0.8,
    });
  });

  it('keeps remaining edge decorations when clearing one plugin', () => {
    const manager = new DecorationManager();

    manager.decorateEdge('plugin-a', 'a->b', { color: '#ef4444', priority: 0 });
    manager.decorateEdge('plugin-b', 'a->b', { style: 'dashed', priority: 5 });

    manager.clearDecorations('plugin-a');

    expect(manager.getMergedEdgeDecorations().get('a->b')).toEqual({
      style: 'dashed',
      priority: 5,
    });
  });
});
