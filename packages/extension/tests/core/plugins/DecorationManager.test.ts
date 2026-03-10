import { describe, it, expect, vi } from 'vitest';
import { DecorationManager } from '../../../src/core/plugins/DecorationManager';

describe('DecorationManager', () => {
  describe('node decorations', () => {
    it('stores and retrieves a node decoration', () => {
      const dm = new DecorationManager();
      dm.decorateNode('p1', 'file.ts', { color: '#ff0000' });

      const merged = dm.getMergedNodeDecorations();
      expect(merged.size).toBe(1);
      expect(merged.get('file.ts')?.color).toBe('#ff0000');
    });

    it('dispose removes the decoration', () => {
      const dm = new DecorationManager();
      const d = dm.decorateNode('p1', 'file.ts', { color: '#ff0000' });

      d.dispose();

      expect(dm.getMergedNodeDecorations().size).toBe(0);
    });

    it('merges non-conflicting properties from multiple plugins', () => {
      const dm = new DecorationManager();
      dm.decorateNode('p1', 'file.ts', { color: '#ff0000', priority: 1 });
      dm.decorateNode('p2', 'file.ts', {
        badge: { text: '5', color: '#fff' },
        priority: 0,
      });

      const merged = dm.getMergedNodeDecorations().get('file.ts')!;
      expect(merged.color).toBe('#ff0000');
      expect(merged.badge?.text).toBe('5');
    });

    it('higher priority wins for conflicting properties', () => {
      const dm = new DecorationManager();
      dm.decorateNode('p1', 'file.ts', { color: '#ff0000', priority: 5 });
      dm.decorateNode('p2', 'file.ts', { color: '#00ff00', priority: 10 });

      const merged = dm.getMergedNodeDecorations().get('file.ts')!;
      expect(merged.color).toBe('#00ff00');
    });

    it('tooltip sections are concatenated from all plugins', () => {
      const dm = new DecorationManager();
      dm.decorateNode('p1', 'file.ts', {
        tooltip: { sections: [{ title: 'A', content: 'a' }] },
        priority: 1,
      });
      dm.decorateNode('p2', 'file.ts', {
        tooltip: { sections: [{ title: 'B', content: 'b' }] },
        priority: 0,
      });

      const merged = dm.getMergedNodeDecorations().get('file.ts')!;
      expect(merged.tooltip?.sections).toHaveLength(2);
      expect(merged.tooltip?.sections[0].title).toBe('A');
      expect(merged.tooltip?.sections[1].title).toBe('B');
    });
  });

  describe('edge decorations', () => {
    it('stores and retrieves an edge decoration', () => {
      const dm = new DecorationManager();
      dm.decorateEdge('p1', 'a->b', { color: '#ff0000', width: 3 });

      const merged = dm.getMergedEdgeDecorations();
      expect(merged.size).toBe(1);
      expect(merged.get('a->b')?.color).toBe('#ff0000');
      expect(merged.get('a->b')?.width).toBe(3);
    });

    it('merges edge decorations from multiple plugins', () => {
      const dm = new DecorationManager();
      dm.decorateEdge('p1', 'a->b', { color: '#ff0000', priority: 1 });
      dm.decorateEdge('p2', 'a->b', { style: 'dashed', priority: 0 });

      const merged = dm.getMergedEdgeDecorations().get('a->b')!;
      expect(merged.color).toBe('#ff0000');
      expect(merged.style).toBe('dashed');
    });
  });

  describe('clearDecorations', () => {
    it('removes all decorations for a specific plugin', () => {
      const dm = new DecorationManager();
      dm.decorateNode('p1', 'a.ts', { color: '#ff0000' });
      dm.decorateNode('p1', 'b.ts', { color: '#00ff00' });
      dm.decorateNode('p2', 'a.ts', { opacity: 0.5 });
      dm.decorateEdge('p1', 'a->b', { color: '#ff0000' });

      dm.clearDecorations('p1');

      const nodes = dm.getMergedNodeDecorations();
      const edges = dm.getMergedEdgeDecorations();

      expect(nodes.size).toBe(1); // only p2's decoration on a.ts remains
      expect(nodes.get('a.ts')?.opacity).toBe(0.5);
      expect(nodes.get('a.ts')?.color).toBeUndefined();
      expect(edges.size).toBe(0);
    });
  });

  describe('change notifications', () => {
    it('fires onChange when decoration is added', () => {
      const dm = new DecorationManager();
      const handler = vi.fn();
      dm.onDecorationsChanged(handler);

      dm.decorateNode('p1', 'a.ts', { color: '#ff0000' });

      expect(handler).toHaveBeenCalledOnce();
    });

    it('fires onChange when decoration is disposed', () => {
      const dm = new DecorationManager();
      const d = dm.decorateNode('p1', 'a.ts', { color: '#ff0000' });

      const handler = vi.fn();
      dm.onDecorationsChanged(handler);

      d.dispose();

      expect(handler).toHaveBeenCalledOnce();
    });

    it('fires onChange when clearDecorations is called', () => {
      const dm = new DecorationManager();
      dm.decorateNode('p1', 'a.ts', { color: '#ff0000' });

      const handler = vi.fn();
      dm.onDecorationsChanged(handler);

      dm.clearDecorations('p1');

      expect(handler).toHaveBeenCalledOnce();
    });

    it('dispose stops receiving notifications', () => {
      const dm = new DecorationManager();
      const handler = vi.fn();
      const sub = dm.onDecorationsChanged(handler);
      sub.dispose();

      dm.decorateNode('p1', 'a.ts', { color: '#ff0000' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('does not fire onChange when clearDecorations has no effect', () => {
      const dm = new DecorationManager();
      const handler = vi.fn();
      dm.onDecorationsChanged(handler);

      dm.clearDecorations('nonexistent');

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
