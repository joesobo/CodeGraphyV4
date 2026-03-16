import { describe, it, expect } from 'vitest';
import { mergeNodeDecorations, mergeEdgeDecorations } from '../../../src/core/plugins/decorationMerge';
import type { NodeDecoration, EdgeDecoration } from '../../../src/core/plugins/decorationMerge';

describe('mergeNodeDecorations', () => {
  it('returns the single decoration unchanged when given one decoration', () => {
    const decoration: NodeDecoration = { color: '#ff0000', opacity: 0.8 };
    const result = mergeNodeDecorations([decoration]);
    expect(result.color).toBe('#ff0000');
    expect(result.opacity).toBe(0.8);
  });

  it('uses the first decoration color when multiple decorations have color', () => {
    const decorations: NodeDecoration[] = [
      { color: '#ff0000' },
      { color: '#00ff00' },
    ];
    const result = mergeNodeDecorations(decorations);
    expect(result.color).toBe('#ff0000');
  });

  it('fills in properties from later decorations when earlier ones are missing them', () => {
    const decorations: NodeDecoration[] = [
      { color: '#ff0000' },
      { badge: { text: '5' } },
    ];
    const result = mergeNodeDecorations(decorations);
    expect(result.color).toBe('#ff0000');
    expect(result.badge?.text).toBe('5');
  });

  it('uses first-set-wins for badge', () => {
    const decorations: NodeDecoration[] = [
      { badge: { text: 'first' } },
      { badge: { text: 'second' } },
    ];
    const result = mergeNodeDecorations(decorations);
    expect(result.badge?.text).toBe('first');
  });

  it('uses first-set-wins for border', () => {
    const decorations: NodeDecoration[] = [
      { border: { color: '#ff0000', width: 2 } },
      { border: { color: '#00ff00', width: 4 } },
    ];
    const result = mergeNodeDecorations(decorations);
    expect(result.border?.color).toBe('#ff0000');
  });

  it('uses first-set-wins for label', () => {
    const decorations: NodeDecoration[] = [
      { label: { text: 'first label' } },
      { label: { text: 'second label' } },
    ];
    const result = mergeNodeDecorations(decorations);
    expect(result.label?.text).toBe('first label');
  });

  it('uses first-set-wins for size', () => {
    const decorations: NodeDecoration[] = [
      { size: { scale: 1.5 } },
      { size: { scale: 2.0 } },
    ];
    const result = mergeNodeDecorations(decorations);
    expect(result.size?.scale).toBe(1.5);
  });

  it('uses first-set-wins for opacity including zero', () => {
    const decorations: NodeDecoration[] = [
      { opacity: 0 },
      { opacity: 0.8 },
    ];
    const result = mergeNodeDecorations(decorations);
    expect(result.opacity).toBe(0);
  });

  it('uses first-set-wins for icon', () => {
    const decorations: NodeDecoration[] = [
      { icon: 'first-icon' },
      { icon: 'second-icon' },
    ];
    const result = mergeNodeDecorations(decorations);
    expect(result.icon).toBe('first-icon');
  });

  it('uses first-set-wins for group', () => {
    const decorations: NodeDecoration[] = [
      { group: 'groupA' },
      { group: 'groupB' },
    ];
    const result = mergeNodeDecorations(decorations);
    expect(result.group).toBe('groupA');
  });

  it('concatenates tooltip sections from all decorations', () => {
    const decorations: NodeDecoration[] = [
      { tooltip: { sections: [{ title: 'A', content: 'content-a' }] } },
      { tooltip: { sections: [{ title: 'B', content: 'content-b' }] } },
      { tooltip: { sections: [{ title: 'C', content: 'content-c' }] } },
    ];
    const result = mergeNodeDecorations(decorations);
    expect(result.tooltip?.sections).toHaveLength(3);
    expect(result.tooltip?.sections[0].title).toBe('A');
    expect(result.tooltip?.sections[1].title).toBe('B');
    expect(result.tooltip?.sections[2].title).toBe('C');
  });

  it('omits tooltip when no decorations have tooltip sections', () => {
    const decorations: NodeDecoration[] = [
      { color: '#ff0000' },
      { color: '#00ff00' },
    ];
    const result = mergeNodeDecorations(decorations);
    expect(result.tooltip).toBeUndefined();
  });

  it('collects tooltip sections only from decorations that have them', () => {
    const decorations: NodeDecoration[] = [
      { color: '#ff0000' },
      { tooltip: { sections: [{ title: 'Only', content: 'content' }] } },
    ];
    const result = mergeNodeDecorations(decorations);
    expect(result.tooltip?.sections).toHaveLength(1);
    expect(result.tooltip?.sections[0].title).toBe('Only');
  });
});

describe('mergeEdgeDecorations', () => {
  it('returns the single decoration unchanged when given one decoration', () => {
    const decoration: EdgeDecoration = { color: '#ff0000', width: 3 };
    const result = mergeEdgeDecorations([decoration]);
    expect(result.color).toBe('#ff0000');
    expect(result.width).toBe(3);
  });

  it('uses first-set-wins for color', () => {
    const decorations: EdgeDecoration[] = [
      { color: '#ff0000' },
      { color: '#00ff00' },
    ];
    const result = mergeEdgeDecorations(decorations);
    expect(result.color).toBe('#ff0000');
  });

  it('uses first-set-wins for width including zero', () => {
    const decorations: EdgeDecoration[] = [
      { width: 0 },
      { width: 5 },
    ];
    const result = mergeEdgeDecorations(decorations);
    expect(result.width).toBe(0);
  });

  it('uses first-set-wins for style', () => {
    const decorations: EdgeDecoration[] = [
      { style: 'dashed' },
      { style: 'dotted' },
    ];
    const result = mergeEdgeDecorations(decorations);
    expect(result.style).toBe('dashed');
  });

  it('uses first-set-wins for label', () => {
    const decorations: EdgeDecoration[] = [
      { label: { text: 'first' } },
      { label: { text: 'second' } },
    ];
    const result = mergeEdgeDecorations(decorations);
    expect(result.label?.text).toBe('first');
  });

  it('uses first-set-wins for particles', () => {
    const decorations: EdgeDecoration[] = [
      { particles: { count: 3, color: '#ff0000' } },
      { particles: { count: 10, color: '#00ff00' } },
    ];
    const result = mergeEdgeDecorations(decorations);
    expect(result.particles?.count).toBe(3);
    expect(result.particles?.color).toBe('#ff0000');
  });

  it('uses first-set-wins for opacity including zero', () => {
    const decorations: EdgeDecoration[] = [
      { opacity: 0 },
      { opacity: 0.5 },
    ];
    const result = mergeEdgeDecorations(decorations);
    expect(result.opacity).toBe(0);
  });

  it('uses first-set-wins for curvature including zero', () => {
    const decorations: EdgeDecoration[] = [
      { curvature: 0 },
      { curvature: 0.5 },
    ];
    const result = mergeEdgeDecorations(decorations);
    expect(result.curvature).toBe(0);
  });

  it('fills in properties from later decorations when earlier ones are missing them', () => {
    const decorations: EdgeDecoration[] = [
      { color: '#ff0000' },
      { style: 'dashed', width: 2 },
    ];
    const result = mergeEdgeDecorations(decorations);
    expect(result.color).toBe('#ff0000');
    expect(result.style).toBe('dashed');
    expect(result.width).toBe(2);
  });
});
