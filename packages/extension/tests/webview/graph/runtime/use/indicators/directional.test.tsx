import { describe, expect, it, vi } from 'vitest';
import type { FGLink, FGNode } from '../../../../../../src/webview/components/graph/model/build';
import { drawOwnedGraphParticles } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/drawing/overlay';

function options(directionMode: 'arrows' | 'particles' | 'none' = 'particles') {
  const source = { id: 'a', x: 0, y: 0 } as FGNode;
  const target = { id: 'b', x: 100, y: 0 } as FGNode;
  const arc = vi.fn();
  return {
    arc,
    value: {
      context: {
        beginPath: vi.fn(),
        arc,
        fill: vi.fn(),
        set fillStyle(_value: string) {},
      } as unknown as CanvasRenderingContext2D,
      directionMode,
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
    },
  };
}

describe('owned directional indicators', () => {
  it('applies particle settings to the overlay', () => {
    const fixture = options();
    drawOwnedGraphParticles(fixture.value);
    expect(fixture.arc).toHaveBeenCalledTimes(2);
    expect(fixture.value.getParticleColor).toHaveBeenCalledOnce();
  });

  it('does not depend on physics animation pause state', () => {
    const fixture = options();
    expect(() => drawOwnedGraphParticles(fixture.value)).not.toThrow();
  });

  it('leaves arrows to the WebGPU link pipeline without Canvas particles', () => {
    const fixture = options('arrows');
    drawOwnedGraphParticles(fixture.value);
    expect(fixture.arc).not.toHaveBeenCalled();
  });

  it('does not require optional imperative directional methods', () => {
    const fixture = options();
    expect(() => drawOwnedGraphParticles(fixture.value)).not.toThrow();
  });

  it('skips particle updates when no links are available', () => {
    const fixture = options();
    fixture.value.links = [];
    drawOwnedGraphParticles(fixture.value);
    expect(fixture.arc).not.toHaveBeenCalled();
  });

  it('reapplies directional behavior when direction mode changes', () => {
    const fixture = options('none');
    drawOwnedGraphParticles(fixture.value);
    expect(fixture.arc).not.toHaveBeenCalled();
    fixture.value.directionMode = 'particles';
    drawOwnedGraphParticles(fixture.value);
    expect(fixture.arc).toHaveBeenCalledTimes(2);
  });
});
