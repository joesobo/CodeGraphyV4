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


    it('reapplies settings when particle size changes', () => {
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
        particleSize: 5,
      });

      expect(graph.linkDirectionalParticleWidth).toHaveBeenCalledWith(5);
      expect(graph.d3ReheatSimulation).toHaveBeenCalledOnce();
    });



    it('reapplies settings when particle speed changes', () => {
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
        particleSpeed: 0.25,
      });

      expect(graph.linkDirectionalParticleSpeed).toHaveBeenCalledWith(0.25);
      expect(graph.d3ReheatSimulation).toHaveBeenCalledOnce();
    });



    it('reapplies settings when the arrow color callback changes', () => {
      const graph = createGraph();
      const options = createHookOptions({
        fg2dRef: createRef(graph),
      });
      const { rerender } = renderHook(
        (props: Parameters<typeof useDirectional>[0]) => useDirectional(props),
        { initialProps: options },
      );
      const getArrowColor = vi.fn(() => '#fedcba');

      vi.clearAllMocks();
      rerender({
        ...options,
        getArrowColor,
      });

      expect(graph.linkDirectionalArrowColor).toHaveBeenCalledWith('#fedcba');
      expect(graph.d3ReheatSimulation).toHaveBeenCalledOnce();
    });



    it('reapplies settings when the arrow position callback changes', () => {
      const graph = createGraph();
      const options = createHookOptions({
        fg2dRef: createRef(graph),
      });
      const { rerender } = renderHook(
        (props: Parameters<typeof useDirectional>[0]) => useDirectional(props),
        { initialProps: options },
      );
      const getArrowRelPos = vi.fn(() => 0.75);

      vi.clearAllMocks();
      rerender({
        ...options,
        getArrowRelPos,
      });

      expect(graph.linkDirectionalArrowRelPos).toHaveBeenCalledWith(0.75);
      expect(graph.d3ReheatSimulation).toHaveBeenCalledOnce();
    });



    it('reapplies settings when the link particle callback changes', () => {
      const graph = createGraph();
      const options = createHookOptions({
        fg2dRef: createRef(graph),
      });
      const { rerender } = renderHook(
        (props: Parameters<typeof useDirectional>[0]) => useDirectional(props),
        { initialProps: options },
      );
      const getLinkParticles = vi.fn();

      vi.clearAllMocks();
      rerender({
        ...options,
        getLinkParticles,
      });

      expect(graph.linkDirectionalParticles).toHaveBeenCalledWith(getLinkParticles);
      expect(graph.d3ReheatSimulation).toHaveBeenCalledOnce();
    });



    it('reapplies settings when the particle color callback changes', () => {
      const graph = createGraph();
      const options = createHookOptions({
        fg2dRef: createRef(graph),
      });
      const { rerender } = renderHook(
        (props: Parameters<typeof useDirectional>[0]) => useDirectional(props),
        { initialProps: options },
      );
      const getParticleColor = vi.fn();

      vi.clearAllMocks();
      rerender({
        ...options,
        getParticleColor,
      });

      expect(graph.linkDirectionalParticleColor).toHaveBeenCalledWith(getParticleColor);
      expect(graph.d3ReheatSimulation).toHaveBeenCalledOnce();
    });



    it('reapplies settings when the graph ref changes', () => {
      const firstGraph = createGraph();
      const secondGraph = createGraph();
      const options = createHookOptions({
        fg2dRef: createRef(firstGraph),
      });
      const { rerender } = renderHook(
        (props: Parameters<typeof useDirectional>[0]) => useDirectional(props),
        { initialProps: options },
      );

      vi.clearAllMocks();
      rerender({
        ...options,
        fg2dRef: createRef(secondGraph),
      });

      expect(secondGraph.linkDirectionalArrowLength).toHaveBeenCalledWith(0);
      expect(secondGraph.d3ReheatSimulation).toHaveBeenCalledOnce();
    });
});
