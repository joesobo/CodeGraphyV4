import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  GraphRendererFrame,
  GraphRendererLink,
  GraphRendererNode,
  GraphRendererSecondaryFrame,
} from '@graph-renderer';
import { WebGpuGraphRenderer } from '@graph-renderer';
import {
  cleanUpWebGpuHarness,
  webGpuHarness,
} from '../harness/webgpu';

interface ProfileFixture {
  frame: GraphRendererFrame;
  secondary: GraphRendererSecondaryFrame;
}

function profileFixture(nodeCount: number, edgeCount: number): ProfileFixture {
  const width = Math.ceil(Math.sqrt(nodeCount));
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({
    id: `node-${index}`,
    x: index % width * 24,
    y: Math.floor(index / width) * 24,
  }));
  const nodeX = Float32Array.from(nodes, node => node.x);
  const nodeY = Float32Array.from(nodes, node => node.y);
  const edgeSources = new Uint32Array(edgeCount);
  const edgeTargets = new Uint32Array(edgeCount);
  const links = Array.from({ length: edgeCount }, (_, index) => {
    const sourceIndex = index % nodeCount;
    const targetIndex = index % 29 === 0
      ? sourceIndex
      : (index * 17 + 13) % nodeCount;
    edgeSources[index] = sourceIndex;
    edgeTargets[index] = targetIndex;
    return {
      curvature: index % 3 === 0 ? 0.5 : 0,
      source: nodes[sourceIndex],
      target: nodes[targetIndex],
    } satisfies GraphRendererLink;
  });
  const getNodeStyle = (node: GraphRendererNode) => {
    const wide = Number(node.id.slice(5)) % 7 === 0;
    return {
      borderColor: '#18202a',
      borderWidth: 1,
      cornerRadius: 2,
      fillColor: wide ? 'rgb(88 166 255)' : '#7ee787',
      fillOpacity: 0.9,
      height: wide ? 18 : 14,
      opacity: 1,
      shape: 'rectangle' as const,
      width: wide ? 30 : 14,
    };
  };
  const frame: GraphRendererFrame = {
    backgroundColor: '#0d1117',
    camera: { centerX: 0, centerY: 0, zoom: 1 },
    cssHeight: 800,
    cssWidth: 1200,
    devicePixelRatio: 1,
    directionMode: 'none',
    edgeSources,
    edgeTargets,
    getArrowColor: () => '#8b949e',
    getLinkColor: () => 'rgba(139, 148, 158, 0.7)',
    getLinkOpacity: () => 0.7,
    getLinkWidth: () => 1,
    getNodeStyle,
    hoveredNodeIndex: -1,
    hoveredNodeScale: 1,
    links,
    nodes,
    nodeX,
    nodeY,
    positionVersion: 1,
    styleVersion: 1,
  };
  return {
    frame,
    secondary: {
      backgroundColor: '#0d1117',
      camera: { centerX: 0, centerY: 0, zoom: 0.25 },
      cssHeight: 160,
      cssWidth: 160,
      devicePixelRatio: 1,
      getLinkColor: () => 'rgba(139, 148, 158, 0.7)',
      getLinkOpacity: () => 0.7,
      getLinkWidth: () => 1,
      getNodeStyle,
      styleVersion: 1,
    },
  };
}

async function settleFrameQueue(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(cleanUpWebGpuHarness);

describe.skipIf(process.env.CODEGRAPHY_PROFILE_MINIMAP !== '1')(
  'secondary graph surface CPU profile',
  () => {
    it('measures disabled, retained-style, and refreshed-style renderer paths', async () => {
      for (const profile of [
        { edges: 300, iterations: 30, name: 'small', nodes: 100 },
        { edges: 3_000, iterations: 15, name: 'medium', nodes: 1_000 },
        { edges: 15_000, iterations: 10, name: 'dense', nodes: 5_000 },
      ]) {
        const harness = webGpuHarness();
        const renderer = await WebGpuGraphRenderer.create(harness.canvas, {
          onDeviceLost: vi.fn(),
          onFrameComplete: vi.fn(),
          onRendererError: vi.fn(),
        });
        const secondaryCanvas = document.createElement('canvas');
        Object.defineProperty(secondaryCanvas, 'getContext', {
          configurable: true,
          value: () => harness.context,
        });
        renderer!.setSecondarySurface(secondaryCanvas);
        const fixture = profileFixture(profile.nodes, profile.edges);
        renderer!.render(fixture.frame, fixture.secondary);
        await settleFrameQueue();

        const measure = async (mode: 'disabled' | 'retained' | 'refreshed') => {
          const renderOnce = async (): Promise<{ cpuMs: number; secondaryCpuMs: number }> => {
            fixture.frame.nodeX[0] += 0.25;
            fixture.frame.positionVersion += 1;
            if (mode === 'refreshed') fixture.secondary.styleVersion += 1;
            harness.writeBuffer.mockClear();
            const startedAt = performance.now();
            renderer!.render(
              fixture.frame,
              mode === 'disabled' ? undefined : fixture.secondary,
            );
            const cpuMs = performance.now() - startedAt;
            const secondaryCpuMs = renderer!.lastSecondaryRefreshCpuMs() ?? 0;
            await settleFrameQueue();
            return { cpuMs, secondaryCpuMs };
          };
          await renderOnce();
          let cpuMs = 0;
          let reportedSecondaryCpuMs = 0;
          for (let index = 0; index < profile.iterations; index += 1) {
            const measurement = await renderOnce();
            cpuMs += measurement.cpuMs;
            reportedSecondaryCpuMs += measurement.secondaryCpuMs;
          }
          return {
            cpuMs: cpuMs / profile.iterations,
            secondaryCpuMs: reportedSecondaryCpuMs / profile.iterations,
          };
        };

        const disabled = await measure('disabled');
        const retained = await measure('retained');
        const refreshed = await measure('refreshed');
        const refreshIncrementMs = Math.max(0, refreshed.cpuMs - disabled.cpuMs);
        process.stdout.write(`${JSON.stringify({
          ...profile,
          disabledCpuMs: disabled.cpuMs,
          retainedCpuMs: retained.cpuMs,
          retainedSecondaryCpuMs: retained.secondaryCpuMs,
          refreshedCpuMs: refreshed.cpuMs,
          refreshedSecondaryCpuMs: refreshed.secondaryCpuMs,
          refreshIncrementMs,
          cappedCpuMsPerSecond: refreshIncrementMs * 8,
          amortizedCpuMsPerFrame: refreshIncrementMs * 8 / 60,
        })}\n`);
        expect(harness.device.queue.submit).toHaveBeenCalled();
        renderer!.dispose();
        cleanUpWebGpuHarness();
      }
    }, 30_000);
  },
);
