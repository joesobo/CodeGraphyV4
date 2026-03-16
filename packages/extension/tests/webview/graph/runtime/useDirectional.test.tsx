import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDirectional } from '../../../../src/webview/components/graph/runtime/useDirectional';

function createGraph() {
  return {
    d3ReheatSimulation: vi.fn(),
    linkDirectionalArrowColor: vi.fn(),
    linkDirectionalArrowLength: vi.fn(),
    linkDirectionalArrowRelPos: vi.fn(),
    linkDirectionalParticleColor: vi.fn(),
    linkDirectionalParticleSpeed: vi.fn(),
    linkDirectionalParticleWidth: vi.fn(),
    linkDirectionalParticles: vi.fn(),
    resumeAnimation: vi.fn(),
  };
}

describe('useDirectional', () => {
  it('applies directional callbacks for 2d graphs', () => {
    const graph = createGraph();
    const fg2dRef = { current: graph as unknown as Parameters<typeof useDirectional>[0]['fg2dRef']['current'] };
    const getArrowColor = vi.fn();
    const getArrowRelPos = vi.fn();
    const getLinkParticles = vi.fn();
    const getParticleColor = vi.fn();

    renderHook(() => useDirectional({
      directionMode: 'particles',
      fg2dRef,
      getArrowColor,
      getArrowRelPos,
      getLinkParticles,
      getParticleColor,
      graphMode: '2d',
      particleSize: 3,
      particleSpeed: 0.15,
    }));

    expect(graph.linkDirectionalArrowLength).toHaveBeenCalledWith(0);
    expect(graph.linkDirectionalArrowRelPos).toHaveBeenCalledWith(getArrowRelPos);
    expect(graph.linkDirectionalParticles).toHaveBeenCalledWith(getLinkParticles);
    expect(graph.linkDirectionalParticleWidth).toHaveBeenCalledWith(3);
    expect(graph.linkDirectionalParticleSpeed).toHaveBeenCalledWith(0.15);
    expect(graph.linkDirectionalArrowColor).toHaveBeenCalledWith(getArrowColor);
    expect(graph.linkDirectionalParticleColor).toHaveBeenCalledWith(getParticleColor);
    expect(graph.d3ReheatSimulation).toHaveBeenCalledOnce();
    expect(graph.resumeAnimation).toHaveBeenCalledOnce();
  });

  it('skips directional updates outside 2d mode', () => {
    const graph = createGraph();

    renderHook(() => useDirectional({
      directionMode: 'arrows',
      fg2dRef: { current: graph as unknown as Parameters<typeof useDirectional>[0]['fg2dRef']['current'] },
      getArrowColor: vi.fn(),
      getArrowRelPos: vi.fn(),
      getLinkParticles: vi.fn(),
      getParticleColor: vi.fn(),
      graphMode: '3d',
      particleSize: 2,
      particleSpeed: 0.1,
    }));

    expect(graph.linkDirectionalArrowLength).not.toHaveBeenCalled();
    expect(graph.d3ReheatSimulation).not.toHaveBeenCalled();
  });
});
