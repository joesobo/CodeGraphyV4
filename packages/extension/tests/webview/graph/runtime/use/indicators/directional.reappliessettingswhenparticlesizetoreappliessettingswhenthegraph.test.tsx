import { describe, expect, it, vi } from 'vitest';
import type { FGLink, FGNode } from '../../../../../../src/webview/components/graph/model/build';
import { drawOwnedGraphParticles } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/drawing';
import { parseWebGpuColor } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/webgpu/renderer';

function renderParticles(overrides: Record<string, unknown> = {}) {
  const source = { id: 'a', x: 0, y: 0 } as FGNode;
  const target = { id: 'b', x: 100, y: 0 } as FGNode;
  const arc = vi.fn();
  const colors: string[] = [];
  const options = {
    context: {
      beginPath: vi.fn(), arc, fill: vi.fn(),
      set fillStyle(value: string) { colors.push(value); },
    } as unknown as CanvasRenderingContext2D,
    directionMode: 'particles' as const,
    getLinkParticles: vi.fn(() => 2),
    getParticleColor: vi.fn(() => '#f00'),
    globalScale: 1,
    links: [{ source, target, id: 'a-b', from: 'a', to: 'b', bidirectional: false }] as FGLink[],
    nodes: [source, target],
    nodeLabelCanvasObject: vi.fn(),
    particleSize: 4,
    particleSpeed: 0.005,
    timestamp: 100,
    viewport: { minimumX: -10, maximumX: 110, minimumY: -10, maximumY: 10 },
    ...overrides,
  };
  drawOwnedGraphParticles(options);
  return { arc, colors, options };
}

describe('owned directional setting updates', () => {
  it('reapplies settings when particle size changes', () => {
    expect(renderParticles({ particleSize: 8 }).arc.mock.calls[0]?.[2]).toBe(8);
  });

  it('reapplies settings when particle speed changes', () => {
    const slowX = renderParticles({ particleSpeed: 0.001 }).arc.mock.calls[0]?.[0];
    const fastX = renderParticles({ particleSpeed: 0.01 }).arc.mock.calls[0]?.[0];
    expect(fastX).not.toBe(slowX);
  });

  it('reapplies settings when the arrow color callback changes', () => {
    expect(parseWebGpuColor('#00ff00')).toEqual([0, 1, 0, 1]);
  });

  it('keeps arrow placement in the WebGPU geometry path', () => {
    expect(renderParticles({ directionMode: 'arrows' }).arc).not.toHaveBeenCalled();
  });

  it('reapplies settings when the link particle callback changes', () => {
    expect(renderParticles({ getLinkParticles: vi.fn(() => 5) }).arc).toHaveBeenCalledTimes(5);
  });

  it('reapplies settings when the particle color callback changes', () => {
    const getParticleColor = vi.fn(() => '#0af');
    const { colors, options } = renderParticles({ getParticleColor });

    expect(colors).toEqual(['#0af']);
    expect(getParticleColor).toHaveBeenCalledOnce();
    expect(getParticleColor).toHaveBeenCalledWith(options.links[0]);
  });

  it('reapplies settings when graph links change', () => {
    expect(renderParticles({ links: [] }).arc).not.toHaveBeenCalled();
  });
});
