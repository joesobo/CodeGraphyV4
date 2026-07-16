import { afterEach, describe, expect, it } from 'vitest';
import type { GraphRendererFrame, GraphRendererLink } from '../../../src';
import { createGraphBufferState } from '../../../src/webgpu/buffer/state';
import { updateLinkRenderOrder } from '../../../src/webgpu/link/order';
import {
  cleanUpWebGpuHarness,
  rendererFrame,
  webGpuHarness,
} from '../renderer/harness/webgpu';

afterEach(cleanUpWebGpuHarness);

function graphState() {
  const device = webGpuHarness().device as unknown as GPUDevice;
  return createGraphBufferState(device);
}

function frameWithLinks(count: number): GraphRendererFrame {
  const frame = rendererFrame();
  frame.links = Array.from({ length: count }, (_, index) => ({
    source: frame.nodes[index % frame.nodes.length],
    target: frame.nodes[(index + 1) % frame.nodes.length],
  }));
  frame.edgeSources = Uint32Array.from(frame.links, (_, index) => index % frame.nodes.length);
  frame.edgeTargets = Uint32Array.from(
    frame.links,
    (_, index) => (index + 1) % frame.nodes.length,
  );
  return frame;
}

describe('link render order', () => {
  it('indexes renderable links once and retains their rendered positions', () => {
    const state = graphState();
    const frame = frameWithLinks(3);

    expect(updateLinkRenderOrder(state, frame, 1)).toBe(true);
    const retainedIndexes = state.renderedLinkIndexes;

    expect(state.renderedLinkOrderRevision).toBe(1);
    expect(state.renderedLinkCount).toBe(3);
    expect(Array.from(state.renderedLinkIndexes)).toEqual([0, 1, 2]);
    expect(frame.links.map(link => state.renderedLinkIndexByLink.get(link))).toEqual([0, 1, 2]);
    expect(updateLinkRenderOrder(state, frame, 1)).toBe(false);
    expect(state.renderedLinkOrderRevision).toBe(1);
    expect(state.renderedLinkIndexes).toBe(retainedIndexes);
  });

  it('reindexes when the edge stride changes', () => {
    const state = graphState();
    const frame = frameWithLinks(3);
    updateLinkRenderOrder(state, frame, 1);

    expect(updateLinkRenderOrder(state, frame, 2)).toBe(true);

    expect(state.indexedEdgeStride).toBe(2);
    expect(state.renderedLinkOrderRevision).toBe(2);
    expect(state.renderedLinkCount).toBe(2);
    expect(Array.from(state.renderedLinkIndexes)).toEqual([0, 2]);
  });

  it.each([
    'links',
    'edgeSources',
    'edgeTargets',
    'nodes',
  ] as const)('reindexes when %s identity changes', field => {
    const state = graphState();
    const frame = frameWithLinks(2);
    updateLinkRenderOrder(state, frame, 1);
    const changed = {
      ...frame,
      [field]: field === 'nodes'
        ? [...frame.nodes, { id: 'extra' }]
        : field === 'links'
          ? [...frame.links]
          : new Uint32Array(frame[field]),
    } as GraphRendererFrame;

    expect(updateLinkRenderOrder(state, changed, 1)).toBe(true);
    expect(state.renderedLinkOrderRevision).toBe(2);
  });

  it('omits links whose source or target is outside the node array', () => {
    const state = graphState();
    const frame = frameWithLinks(3);
    frame.edgeSources = Uint32Array.of(0, frame.nodes.length, 0);
    frame.edgeTargets = Uint32Array.of(1, 1, frame.nodes.length);

    updateLinkRenderOrder(state, frame, 1);

    expect(state.renderedLinkCount).toBe(1);
    expect(Array.from(state.renderedLinkIndexes)).toEqual([0]);
    expect(state.renderedLinkIndexByLink.get(frame.links[0])).toBe(0);
    expect(state.renderedLinkIndexByLink.has(frame.links[1] as GraphRendererLink)).toBe(false);
    expect(state.renderedLinkIndexByLink.has(frame.links[2] as GraphRendererLink)).toBe(false);
  });
});
