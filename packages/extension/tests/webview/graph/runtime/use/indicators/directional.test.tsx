import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  applyDirectionalSettings,
  useDirectional,
} from '../../../../../../src/webview/components/graph/runtime/use/indicators/directional';

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

function createDirectionalOptions(
  overrides: Partial<Parameters<typeof applyDirectionalSettings>[1]> = {},
): Parameters<typeof applyDirectionalSettings>[1] {
  return {
    directionMode: 'particles',
    getArrowColor: vi.fn(() => '#abcdef'),
    getArrowRelPos: vi.fn(() => 1),
    getLinkParticles: vi.fn(),
    getParticleColor: vi.fn(),
    particleSize: 3,
    particleSpeed: 0.15,
    physicsPaused: false,
    ...overrides,
  };
}

function createRef(
  graph: ReturnType<typeof createGraph> | undefined,
): Parameters<typeof useDirectional>[0]['fg2dRef'] {
  return {
    current: graph as unknown as Parameters<typeof useDirectional>[0]['fg2dRef']['current'],
  };
}

function createHookOptions(
  overrides: Partial<Parameters<typeof useDirectional>[0]> = {},
): Parameters<typeof useDirectional>[0] {
  return {
    ...createDirectionalOptions(),
    fg2dRef: createRef(createGraph()),
    graphMode: '2d',
    ...overrides,
  };
}

describe('useDirectional', () => {

    it('applies particle settings to the graph instance', () => {
      const graph = createGraph();
      const options = createDirectionalOptions();

      applyDirectionalSettings(graph, options);

      expect(graph.linkDirectionalArrowLength).toHaveBeenCalledWith(0);
      expect(graph.linkDirectionalArrowRelPos).toHaveBeenCalledWith(1);
      expect(graph.linkDirectionalParticles).toHaveBeenCalledWith(options.getLinkParticles);
      expect(graph.linkDirectionalParticleWidth).toHaveBeenCalledWith(3);
      expect(graph.linkDirectionalParticleSpeed).toHaveBeenCalledWith(0.15);
      expect(graph.linkDirectionalArrowColor).toHaveBeenCalledWith('#abcdef');
      expect(graph.linkDirectionalParticleColor).toHaveBeenCalledWith(options.getParticleColor);
      expect(graph.d3ReheatSimulation).toHaveBeenCalledOnce();
      expect(graph.resumeAnimation).toHaveBeenCalledOnce();
    });



    it('does not resume animation while physics is paused', () => {
      const graph = createGraph();

      applyDirectionalSettings(graph, createDirectionalOptions({ physicsPaused: true }));

      expect(graph.d3ReheatSimulation).toHaveBeenCalledOnce();
      expect(graph.resumeAnimation).not.toHaveBeenCalled();
    });



    it('applies arrow settings without directional particles', () => {
      const graph = createGraph();
      const options = createDirectionalOptions({
        directionMode: 'arrows',
      });

      applyDirectionalSettings(graph, options);

      expect(graph.linkDirectionalArrowLength).toHaveBeenCalledWith(12);
      expect(graph.linkDirectionalParticles).toHaveBeenCalledWith(0);
      expect(graph.d3ReheatSimulation).toHaveBeenCalledOnce();
    });



    it('tolerates graphs that omit optional directional methods', () => {
      const graph = {
        d3ReheatSimulation: vi.fn(),
      } as Parameters<typeof applyDirectionalSettings>[0];

      expect(() => {
        applyDirectionalSettings(graph, createDirectionalOptions({ directionMode: 'none' }));
      }).not.toThrow();
      expect(graph.d3ReheatSimulation).toHaveBeenCalledOnce();
    });



    it('skips directional updates until graph mode becomes 2d', () => {
      const graph = createGraph();
      const options = createHookOptions({
        fg2dRef: createRef(graph),
        graphMode: '3d',
      });

      const { rerender } = renderHook(
        (props: Parameters<typeof useDirectional>[0]) => useDirectional(props),
        { initialProps: options },
      );

      expect(graph.linkDirectionalArrowLength).not.toHaveBeenCalled();
      expect(graph.d3ReheatSimulation).not.toHaveBeenCalled();

      vi.clearAllMocks();
      rerender({
        ...options,
        graphMode: '2d',
      });

      expect(graph.linkDirectionalArrowLength).toHaveBeenCalledWith(0);
      expect(graph.d3ReheatSimulation).toHaveBeenCalledOnce();
    });



    it('skips updates when no 2d graph instance is available', () => {
      expect(() => {
        renderHook(() => useDirectional(createHookOptions({
          fg2dRef: createRef(undefined),
        })));
      }).not.toThrow();
    });



    it('reapplies settings when direction mode changes', () => {
      const graph = createGraph();
      const options = createHookOptions({
        fg2dRef: createRef(graph),
      });
      const { rerender } = renderHook(
        (props: Parameters<typeof useDirectional>[0]) => useDirectional(props),
        { initialProps: options },
      );

      vi.clearAllMocks();
      rerender({
        ...options,
        directionMode: 'arrows',
      });

      expect(graph.linkDirectionalArrowLength).toHaveBeenCalledWith(12);
      expect(graph.linkDirectionalParticles).toHaveBeenCalledWith(0);
    });
});
