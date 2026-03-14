import { describe, expect, it } from 'vitest';
import type { NodeDecoration } from '../../../src/core/plugins/DecorationManager';
import { DecorationManager } from '../../../src/core/plugins/DecorationManager';

describe('DecorationManager node decorations', () => {
  it('returns the original decoration when only one plugin decorates a node', () => {
    const manager = new DecorationManager();
    const decoration: NodeDecoration = { color: '#ff0000' };

    manager.decorateNode('plugin-a', 'file.ts', decoration);

    expect(manager.getMergedNodeDecorations().get('file.ts')).toBe(decoration);
  });

  it('removes a node decoration when its disposable is disposed', () => {
    const manager = new DecorationManager();
    const disposable = manager.decorateNode('plugin-a', 'file.ts', { color: '#ff0000' });

    disposable.dispose();

    expect(manager.getMergedNodeDecorations().size).toBe(0);
  });

  it('fills missing node fields from lower-priority decorations', () => {
    const manager = new DecorationManager();

    manager.decorateNode('plugin-low', 'file.ts', {
      badge: { text: '5', color: '#ffffff' },
      border: { color: '#22c55e', width: 2, style: 'dashed' },
      label: { text: 'low', sublabel: 'priority', color: '#16a34a' },
      size: { scale: 1.25 },
      opacity: 0.4,
      color: '#10b981',
      icon: 'leaf',
      group: 'helpers',
      priority: 0,
    });
    manager.decorateNode('plugin-high', 'file.ts', {
      tooltip: { sections: [{ title: 'High', content: 'priority' }] },
      priority: 10,
    });

    expect(manager.getMergedNodeDecorations().get('file.ts')).toEqual({
      badge: { text: '5', color: '#ffffff' },
      border: { color: '#22c55e', width: 2, style: 'dashed' },
      label: { text: 'low', sublabel: 'priority', color: '#16a34a' },
      size: { scale: 1.25 },
      opacity: 0.4,
      color: '#10b981',
      icon: 'leaf',
      group: 'helpers',
      tooltip: { sections: [{ title: 'High', content: 'priority' }] },
    });
  });

  it('keeps higher-priority node fields when lower-priority decorations conflict', () => {
    const manager = new DecorationManager();

    manager.decorateNode('plugin-low', 'file.ts', {
      badge: { text: 'low', color: '#111111' },
      border: { color: '#ef4444', width: 1, style: 'dotted' },
      label: { text: 'low', sublabel: 'priority', color: '#991b1b' },
      size: { scale: 0.75 },
      opacity: 0.2,
      color: '#f97316',
      icon: 'triangle-alert',
      group: 'warnings',
      priority: 0,
    });
    manager.decorateNode('plugin-high', 'file.ts', {
      badge: { text: 'high', color: '#ffffff' },
      border: { color: '#2563eb', width: 3, style: 'solid' },
      label: { text: 'high', sublabel: 'priority', color: '#1d4ed8' },
      size: { scale: 1.5 },
      opacity: 0.9,
      color: '#3b82f6',
      icon: 'sparkles',
      group: 'focus',
      priority: 10,
    });

    expect(manager.getMergedNodeDecorations().get('file.ts')).toEqual({
      badge: { text: 'high', color: '#ffffff' },
      border: { color: '#2563eb', width: 3, style: 'solid' },
      label: { text: 'high', sublabel: 'priority', color: '#1d4ed8' },
      size: { scale: 1.5 },
      opacity: 0.9,
      color: '#3b82f6',
      icon: 'sparkles',
      group: 'focus',
    });
  });

  it('concatenates tooltip sections in priority order', () => {
    const manager = new DecorationManager();

    manager.decorateNode('plugin-low', 'file.ts', {
      tooltip: { sections: [{ title: 'Low', content: 'priority' }] },
      priority: 0,
    });
    manager.decorateNode('plugin-high', 'file.ts', {
      tooltip: { sections: [{ title: 'High', content: 'priority' }] },
      priority: 10,
    });

    expect(manager.getMergedNodeDecorations().get('file.ts')).toEqual({
      tooltip: {
        sections: [
          { title: 'High', content: 'priority' },
          { title: 'Low', content: 'priority' },
        ],
      },
    });
  });

  it('omits tooltip data when no decoration contributes tooltip sections', () => {
    const manager = new DecorationManager();

    manager.decorateNode('plugin-a', 'file.ts', { color: '#ff0000', priority: 1 });
    manager.decorateNode('plugin-b', 'file.ts', { icon: 'sparkles', priority: 0 });

    expect(manager.getMergedNodeDecorations().get('file.ts')).toEqual({
      color: '#ff0000',
      icon: 'sparkles',
    });
  });
});
