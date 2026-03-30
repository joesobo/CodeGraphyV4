import { describe, expect, it } from 'vitest';
import {
  as2DExtMethods,
  setSpriteVisible,
} from '../../../../src/webview/components/graph/support/contracts';
import {
  hasDistanceAndStrength,
  hasStrength,
  isRecordLike,
} from '../../../../src/webview/components/graph/support/guards';
import {
  resolveEdgeActionTargetId,
  resolveLinkEndpointId,
} from '../../../../src/webview/components/graph/support/linkTargets';
import {
  applyCursorToGraphSurface,
  isMacControlContextClick,
} from '../../../../src/webview/components/graph/support/dom';
import type SpriteText from 'three-spritetext';

describe('graph/support', () => {
  it('recognizes objects and functions as record-like values', () => {
    expect(isRecordLike({ key: 'value' })).toBe(true);
    expect(isRecordLike(() => undefined)).toBe(true);
    expect(isRecordLike(null)).toBe(false);
    expect(isRecordLike('text')).toBe(false);
  });

  it('detects force objects with a strength function', () => {
    expect(hasStrength({ strength: () => undefined })).toBe(true);
    expect(hasStrength({ strength: 'nope' })).toBe(false);
  });

  it('rejects non-record values when looking for a strength function', () => {
    expect(hasStrength('nope')).toBe(false);
    expect(hasStrength(null)).toBe(false);
  });

  it('detects force objects with distance and strength functions', () => {
    expect(hasDistanceAndStrength({ distance: () => undefined, strength: () => undefined })).toBe(true);
    expect(hasDistanceAndStrength({ distance: () => undefined })).toBe(false);
  });

  it('rejects non-record values when looking for distance and strength functions', () => {
    expect(hasDistanceAndStrength('nope')).toBe(false);
    expect(hasDistanceAndStrength(null)).toBe(false);
  });

  it('requires strength to be callable when checking distance and strength functions', () => {
    expect(hasDistanceAndStrength({ distance: () => undefined, strength: 'nope' })).toBe(false);
  });

  it('requires distance to be callable when checking distance and strength functions', () => {
    expect(hasDistanceAndStrength({ distance: 'nope', strength: () => undefined })).toBe(false);
  });

  it('casts force-graph instances without changing the reference', () => {
    const instance = { zoom: () => 1 } as const;

    expect(as2DExtMethods(instance)).toBe(instance);
  });

  it('sets sprite visibility flags', () => {
    const sprite = {} as SpriteText & { visible: boolean };

    setSpriteVisible(sprite, true);
    expect(sprite.visible).toBe(true);

    setSpriteVisible(sprite, false);
    expect(sprite.visible).toBe(false);
  });

  it('resolves link endpoint ids from strings and record objects', () => {
    expect(resolveLinkEndpointId('node-a')).toBe('node-a');
    expect(resolveLinkEndpointId({ id: 'node-b' })).toBe('node-b');
    expect(resolveLinkEndpointId({ id: 3 })).toBeNull();
    expect(resolveLinkEndpointId(null)).toBeNull();
  });

  it('prefers an existing link id when resolving edge action targets', () => {
    expect(
      resolveEdgeActionTargetId('edge-1', 'a.ts', 'b.ts', [{ id: 'edge-1', from: 'a.ts', to: 'b.ts' }])
    ).toBe('edge-1');
  });

  it('keeps a matching link id ahead of endpoint matches for other edges', () => {
    expect(
      resolveEdgeActionTargetId('edge-1', 'a.ts', 'b.ts', [
        { id: 'edge-1', from: 'x.ts', to: 'y.ts' },
        { id: 'forward-edge', from: 'a.ts', to: 'b.ts' },
      ])
    ).toBe('edge-1');
  });

  it('falls back to the forward matching edge id when the link id is missing', () => {
    expect(
      resolveEdgeActionTargetId(undefined, 'a.ts', 'b.ts', [{ id: 'forward-edge', from: 'a.ts', to: 'b.ts' }])
    ).toBe('forward-edge');
  });

  it('ignores a stale link id when a forward edge match exists', () => {
    expect(
      resolveEdgeActionTargetId('stale-edge', 'a.ts', 'b.ts', [{ id: 'forward-edge', from: 'a.ts', to: 'b.ts' }])
    ).toBe('forward-edge');
  });

  it('falls back to the reverse matching edge id when only the reverse edge exists', () => {
    expect(
      resolveEdgeActionTargetId(undefined, 'a.ts', 'b.ts', [{ id: 'reverse-edge', from: 'b.ts', to: 'a.ts' }])
    ).toBe('reverse-edge');
  });

  it('prefers the forward match over unrelated and reverse edges', () => {
    expect(
      resolveEdgeActionTargetId(undefined, 'a.ts', 'b.ts', [
        { id: 'wrong-edge', from: 'a.ts', to: 'c.ts' },
        { id: 'reverse-edge', from: 'b.ts', to: 'a.ts' },
        { id: 'forward-edge', from: 'a.ts', to: 'b.ts' },
      ])
    ).toBe('forward-edge');
  });

  it('requires both source and target for forward edge matches', () => {
    expect(
      resolveEdgeActionTargetId(undefined, 'a.ts', 'b.ts', [
        { id: 'wrong-forward-edge', from: 'c.ts', to: 'b.ts' },
        { id: 'forward-edge', from: 'a.ts', to: 'b.ts' },
      ])
    ).toBe('forward-edge');
  });

  it('finds the reverse match even when unrelated edges appear first', () => {
    expect(
      resolveEdgeActionTargetId(undefined, 'a.ts', 'b.ts', [
        { id: 'wrong-edge', from: 'a.ts', to: 'c.ts' },
        { id: 'reverse-edge', from: 'b.ts', to: 'a.ts' },
      ])
    ).toBe('reverse-edge');
  });

  it('requires both source and target for reverse edge matches', () => {
    expect(
      resolveEdgeActionTargetId(undefined, 'a.ts', 'b.ts', [
        { id: 'wrong-reverse-from', from: 'b.ts', to: 'c.ts' },
        { id: 'wrong-reverse-to', from: 'c.ts', to: 'a.ts' },
        { id: 'reverse-edge', from: 'b.ts', to: 'a.ts' },
      ])
    ).toBe('reverse-edge');
  });

  it('returns a synthetic edge id when no real edge id can be resolved', () => {
    expect(resolveEdgeActionTargetId(undefined, 'a.ts', 'b.ts', [])).toBe('a.ts->b.ts');
  });

  it('treats macOS control-left-click as a context click only on mac platforms', () => {
    const macContextClick = new MouseEvent('click', { button: 0, ctrlKey: true });
    const macMetaClick = new MouseEvent('click', { button: 0, ctrlKey: true, metaKey: true });
    const macRightClick = new MouseEvent('click', { button: 2, ctrlKey: true });

    expect(isMacControlContextClick(macContextClick, true)).toBe(true);
    expect(isMacControlContextClick(macMetaClick, true)).toBe(false);
    expect(isMacControlContextClick(macRightClick, true)).toBe(false);
    expect(isMacControlContextClick(macContextClick, false)).toBe(false);
  });

  it('applies the cursor to the graph container, child elements, and canvases', () => {
    const container = document.createElement('div');
    const child = document.createElement('div');
    const canvas = document.createElement('canvas');
    container.append(child, canvas);

    applyCursorToGraphSurface(container, 'pointer');

    expect(container.style.cursor).toBe('pointer');
    expect(child.style.cursor).toBe('pointer');
    expect(canvas.style.cursor).toBe('pointer');
  });

  it('applies the cursor to nested canvases inside wrapper elements', () => {
    const container = document.createElement('div');
    const wrapper = document.createElement('div');
    const nestedCanvas = document.createElement('canvas');
    wrapper.append(nestedCanvas);
    container.append(wrapper);

    applyCursorToGraphSurface(container, 'pointer');

    expect(wrapper.style.cursor).toBe('pointer');
    expect(nestedCanvas.style.cursor).toBe('pointer');
  });

  it('ignores non-element child nodes when applying the cursor', () => {
    const container = document.createElement('div');
    container.append(document.createTextNode('text node'));

    expect(() => applyCursorToGraphSurface(container, 'pointer')).not.toThrow();
    expect(container.style.cursor).toBe('pointer');
  });
});
