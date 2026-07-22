import { describe, expect, it, vi } from 'vitest';
import type { GraphRendererFrame } from '../../../src/contracts';
import type { GraphBufferState } from '../../../src/webgpu/buffer/state';
import { submitRenderPass, type RenderPassResources } from '../../../src/webgpu/frame/pass';

describe('submitRenderPass', () => {
  it('premultiplies the transparent clear color', () => {
    const pass = { end: vi.fn() } as unknown as GPURenderPassEncoder;
    const beginRenderPass = vi.fn((_descriptor: GPURenderPassDescriptor) => pass);
    const resources = {
      context: {
        getCurrentTexture: vi.fn(() => ({ createView: vi.fn(() => ({})) })),
      },
      device: {
        createCommandEncoder: vi.fn(() => ({
          beginRenderPass,
          finish: vi.fn(() => ({})),
        })),
        queue: { submit: vi.fn() },
      },
    } as unknown as RenderPassResources;
    const frame = {
      backgroundColor: 'rgba(255, 128, 64, 0)',
      camera: { centerX: 0, centerY: 0, zoom: 1 },
      cssHeight: 1,
      cssWidth: 1,
      devicePixelRatio: 1,
      directionMode: 'none',
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
      getArrowColor: () => 'transparent',
      getLinkColor: () => 'transparent',
      getLinkOpacity: () => 0,
      getLinkWidth: () => 0,
      getNodeStyle: () => ({
        borderColor: 'transparent',
        borderWidth: 0,
        cornerRadius: 0,
        fillColor: 'transparent',
        fillOpacity: 0,
        height: 0,
        opacity: 0,
        shape: 'circle',
        width: 0,
      }),
      hoveredNodeIndex: -1,
      hoveredNodeScale: 1,
      links: [],
      nodes: [],
      nodeX: new Float32Array(),
      nodeY: new Float32Array(),
      positionVersion: 0,
      styleVersion: 0,
    } satisfies GraphRendererFrame;
    const state = { renderedLinkCount: 0 } as GraphBufferState;

    submitRenderPass(resources, state, frame, -1);

    const descriptor = beginRenderPass.mock.calls[0]?.[0];
    const [attachment] = descriptor?.colorAttachments ?? [];
    expect(attachment?.clearValue).toEqual([0, 0, 0, 0]);
  });
});
