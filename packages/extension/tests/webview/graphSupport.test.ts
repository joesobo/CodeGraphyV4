import { describe, expect, it } from 'vitest';
import {
  applyCursorToGraphSurface,
  as2DExtMethods,
  hasDistanceAndStrength,
  hasStrength,
  isMacControlContextClick,
  isRecordLike,
  resolveEdgeActionTargetId,
  resolveLinkEndpointId,
  setSpriteVisible,
} from '../../src/webview/components/graphSupport';

describe('graphSupport', () => {
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

  it('detects force objects with distance and strength functions', () => {
    expect(hasDistanceAndStrength({ distance: () => undefined, strength: () => undefined })).toBe(true);
    expect(hasDistanceAndStrength({ distance: () => undefined })).toBe(false);
  });

  it('casts force-graph instances without changing the reference', () => {
    const instance = { zoom: () => 1 } as const;

    expect(as2DExtMethods(instance)).toBe(instance);
  });

  it('sets sprite visibility flags', () => {
    const sprite = {} as { visible?: boolean };

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

  it('falls back to the forward matching edge id when the link id is missing', () => {
    expect(
      resolveEdgeActionTargetId(undefined, 'a.ts', 'b.ts', [{ id: 'forward-edge', from: 'a.ts', to: 'b.ts' }])
    ).toBe('forward-edge');
  });

  it('falls back to the reverse matching edge id when only the reverse edge exists', () => {
    expect(
      resolveEdgeActionTargetId(undefined, 'a.ts', 'b.ts', [{ id: 'reverse-edge', from: 'b.ts', to: 'a.ts' }])
    ).toBe('reverse-edge');
  });

  it('returns a synthetic edge id when no real edge id can be resolved', () => {
    expect(resolveEdgeActionTargetId(undefined, 'a.ts', 'b.ts', [])).toBe('a.ts->b.ts');
  });

  it('treats macOS control-left-click as a context click only on mac platforms', () => {
    const macContextClick = new MouseEvent('click', { button: 0, ctrlKey: true });
    const macMetaClick = new MouseEvent('click', { button: 0, ctrlKey: true, metaKey: true });

    expect(isMacControlContextClick(macContextClick, true)).toBe(true);
    expect(isMacControlContextClick(macMetaClick, true)).toBe(false);
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
});
