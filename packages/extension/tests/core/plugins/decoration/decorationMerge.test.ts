import { describe, it, expect } from 'vitest';
import { mergeNodeDecorations } from '../../../../src/core/plugins/decoration/mergeNodeDecorations';
import { mergeEdgeDecorations } from '../../../../src/core/plugins/decoration/mergeEdgeDecorations';
import type { NodeDecoration, EdgeDecoration } from '../../../../src/core/plugins/decoration/manager';

describe('mergeNodeDecorations', () => {
  it('returns an empty object when given an empty array', () => {
    expect(mergeNodeDecorations([])).toEqual({});
  });

  it('returns the decoration unchanged when given a single entry', () => {
    const decoration: NodeDecoration = { color: '#ff0000', icon: 'star' };
    expect(mergeNodeDecorations([decoration])).toEqual(decoration);
  });

  it('takes badge from the first decoration that defines it', () => {
    const decorations: NodeDecoration[] = [
      { badge: { text: 'first' } },
      { badge: { text: 'second' } },
    ];
    expect(mergeNodeDecorations(decorations).badge?.text).toBe('first');
  });

  it('fills missing properties from later decorations', () => {
    const decorations: NodeDecoration[] = [
      { color: '#ff0000' },
      { icon: 'star', border: { color: '#00ff00' } },
    ];
    const result = mergeNodeDecorations(decorations);
    expect(result.color).toBe('#ff0000');
    expect(result.icon).toBe('star');
    expect(result.border).toEqual({ color: '#00ff00' });
  });

  it('concatenates tooltip sections from all decorations', () => {
    const decorations: NodeDecoration[] = [
      { tooltip: { sections: [{ title: 'Alpha', content: 'first' }] } },
      { tooltip: { sections: [{ title: 'Beta', content: 'second' }] } },
    ];
    const result = mergeNodeDecorations(decorations);
    expect(result.tooltip?.sections).toHaveLength(2);
    expect(result.tooltip?.sections[0].title).toBe('Alpha');
    expect(result.tooltip?.sections[1].title).toBe('Beta');
  });

  it('omits tooltip when no decoration provides sections', () => {
    const result = mergeNodeDecorations([{ color: '#ff0000' }]);
    expect(result.tooltip).toBeUndefined();
  });

  it('preserves opacity from the first decoration that defines it', () => {
    const decorations: NodeDecoration[] = [
      { opacity: 0.5 },
      { opacity: 0.8 },
    ];
    expect(mergeNodeDecorations(decorations).opacity).toBe(0.5);
  });

  it('accepts opacity of zero without overriding it', () => {
    const decorations: NodeDecoration[] = [
      { opacity: 0 },
      { opacity: 0.8 },
    ];
    expect(mergeNodeDecorations(decorations).opacity).toBe(0);
  });
});

describe('mergeEdgeDecorations', () => {
  it('returns an empty object when given an empty array', () => {
    expect(mergeEdgeDecorations([])).toEqual({});
  });

  it('returns the decoration unchanged when given a single entry', () => {
    const decoration: EdgeDecoration = { color: '#ff0000', width: 2 };
    expect(mergeEdgeDecorations([decoration])).toEqual(decoration);
  });

  it('takes color from the first decoration that defines it', () => {
    const decorations: EdgeDecoration[] = [
      { color: '#ff0000' },
      { color: '#00ff00' },
    ];
    expect(mergeEdgeDecorations(decorations).color).toBe('#ff0000');
  });

  it('fills missing fields from later decorations', () => {
    const decorations: EdgeDecoration[] = [
      { color: '#ff0000' },
      { width: 3, style: 'dashed' },
    ];
    const result = mergeEdgeDecorations(decorations);
    expect(result.color).toBe('#ff0000');
    expect(result.width).toBe(3);
    expect(result.style).toBe('dashed');
  });

  it('preserves curvature of zero without treating it as falsy', () => {
    const decorations: EdgeDecoration[] = [
      { curvature: 0 },
      { curvature: 0.5 },
    ];
    expect(mergeEdgeDecorations(decorations).curvature).toBe(0);
  });

  it('preserves width of zero without treating it as falsy', () => {
    const decorations: EdgeDecoration[] = [
      { width: 0 },
      { width: 3 },
    ];
    expect(mergeEdgeDecorations(decorations).width).toBe(0);
  });
});
