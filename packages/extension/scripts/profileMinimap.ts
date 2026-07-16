import { performance } from 'node:perf_hooks';
import {
  measureGraphSceneBounds,
  type GraphRendererLink,
  type GraphRendererNode,
} from '@codegraphy-dev/graph-renderer';
import { fitMinimapSceneProjection } from '../src/webview/components/graph/rendering/surface/owned2d/minimap/scene';

const MINIMAP_PROFILE_PROJECTION_HZ = 8;

interface ProfileFixture {
  links: GraphRendererLink[];
  nodes: GraphRendererNode[];
}

function fixture(nodeCount: number, edgeCount: number): ProfileFixture {
  const width = Math.ceil(Math.sqrt(nodeCount));
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({
    id: `node-${index}`,
    x: index % width * 24,
    y: Math.floor(index / width) * 24,
  }));
  const links = Array.from({ length: edgeCount }, (_, index) => {
    const source = nodes[index % nodeCount];
    const target = index % 29 === 0
      ? source
      : nodes[(index * 17 + 13) % nodeCount];
    return {
      curvature: index % 3 === 0 ? 0.5 : 0,
      source,
      target,
    };
  });
  return { links, nodes };
}

const getNodeStyle = () => ({
  borderColor: '#000000', borderWidth: 1, cornerRadius: 0,
  fillColor: '#6699cc', fillOpacity: 1, height: 16, opacity: 1,
  shape: 'circle' as const, width: 16,
});

function averageMs(iterations: number, operation: () => void): number {
  for (let index = 0; index < 5; index += 1) operation();
  const startedAt = performance.now();
  for (let index = 0; index < iterations; index += 1) operation();
  return (performance.now() - startedAt) / iterations;
}

for (const profile of [
  { edges: 300, name: 'small', nodes: 100 },
  { edges: 3_000, name: 'medium', nodes: 1_000 },
  { edges: 15_000, name: 'dense', nodes: 5_000 },
]) {
  const graph = fixture(profile.nodes, profile.edges);
  const scene = { ...graph, getNodeStyle };
  const iterations = profile.name === 'dense' ? 10 : 30;
  const renderedBoundsValidationMs = averageMs(iterations, () => {
    measureGraphSceneBounds({ ...scene, zoom: 1 });
  });
  const projectionMs = averageMs(iterations, () => {
    fitMinimapSceneProjection(scene, 160, 12);
  });
  console.log(JSON.stringify({
    ...profile,
    cappedCpuMsPerSecond: projectionMs * MINIMAP_PROFILE_PROJECTION_HZ,
    projectionMs,
    renderedBoundsValidationMs,
  }));
}
