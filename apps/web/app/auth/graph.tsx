'use client';

import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { useEffect, useMemo, useRef, useState } from 'react';

type AuthGraphNode = SimulationNodeDatum & {
  clusterId: number;
  fill: string;
  id: number;
  orbitSpeed: number;
  radius: number;
};

type AuthGraphEdge = SimulationLinkDatum<AuthGraphNode> & {
  id: string;
  source: number;
  target: number;
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function blueFill(): string {
  return `hsl(${Math.round(randomBetween(198, 214))} ${Math.round(randomBetween(56, 76))}% ${Math.round(randomBetween(76, 88))}%)`;
}

function createAuthGraph(): {
  edges: AuthGraphEdge[];
  nodes: AuthGraphNode[];
} {
  const clusterCount = 4;
  const nodeCount = 34;
  const center = 500;
  const clusterCenters = Array.from({ length: clusterCount }, (_, index) => {
    const angle = index * ((Math.PI * 2) / clusterCount) + randomBetween(-0.28, 0.28);
    const distance = randomBetween(245, 360);

    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    };
  });
  const nodes = Array.from({ length: nodeCount }, (_, index) => {
    const clusterId = index % clusterCount;
    const clusterCenter = clusterCenters[clusterId];
    const angle = randomBetween(0, Math.PI * 2);
    const distance = randomBetween(56, 180);

    return {
      clusterId,
      fill: blueFill(),
      id: index,
      orbitSpeed: randomBetween(0.018, 0.052),
      radius: randomBetween(30, 58),
      x: clusterCenter.x + Math.cos(angle) * distance,
      y: clusterCenter.y + Math.sin(angle) * distance,
    };
  });
  const edges: AuthGraphEdge[] = [];
  const addEdge = (source: number, target: number): void => {
    const id = source < target ? `${source}-${target}` : `${target}-${source}`;

    if (source === target || edges.some(edge => edge.id === id)) {
      return;
    }

    edges.push({ id, source, target });
  };

  const clusters = Array.from({ length: clusterCount }, (_, clusterId) => nodes.filter(node => node.clusterId === clusterId));

  clusters.forEach(cluster => {
    for (let index = 1; index < cluster.length; index += 1) {
      addEdge(cluster[index - 1].id, cluster[index].id);
    }

    if (cluster.length > 3) {
      addEdge(cluster[0].id, cluster[Math.floor(cluster.length / 2)].id);
    }
  });

  for (let clusterIndex = 1; clusterIndex < clusters.length; clusterIndex += 1) {
    const previousCluster = clusters[clusterIndex - 1];
    const currentCluster = clusters[clusterIndex];

    addEdge(previousCluster[0].id, currentCluster[0].id);
  }

  return { edges, nodes };
}

export function AuthGraphField(): React.ReactElement | null {
  const [isEnabled, setIsEnabled] = useState(false);
  const [renderTick, setRenderTick] = useState(0);
  const graph = useMemo(() => {
    const nextGraph = createAuthGraph();

    return {
      edges: nextGraph.edges,
      nodes: nextGraph.nodes,
    };
  }, []);
  const simulationRef = useRef<Simulation<AuthGraphNode, AuthGraphEdge> | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateEnabled = (): void => {
      setIsEnabled(desktopQuery.matches && !reducedMotionQuery.matches);
    };

    updateEnabled();
    desktopQuery.addEventListener('change', updateEnabled);
    reducedMotionQuery.addEventListener('change', updateEnabled);

    return () => {
      desktopQuery.removeEventListener('change', updateEnabled);
      reducedMotionQuery.removeEventListener('change', updateEnabled);
    };
  }, []);

  useEffect(() => {
    if (!isEnabled) {
      simulationRef.current?.stop();
      simulationRef.current = null;
      return;
    }

    const simulation = forceSimulation<AuthGraphNode, AuthGraphEdge>(graph.nodes)
      .alpha(0.82)
      .alphaTarget(0.11)
      .velocityDecay(0.34)
      .force('center', forceCenter<AuthGraphNode>(500, 500).strength(0.032))
      .force('charge', forceManyBody<AuthGraphNode>().strength(-72))
      .force('collision', forceCollide<AuthGraphNode>().radius(node => node.radius + 14).iterations(4))
      .force(
        'link',
        forceLink<AuthGraphNode, AuthGraphEdge>(graph.edges)
          .id(node => node.id)
          .distance(52)
          .strength(0.44),
      )
      .force('x', forceX<AuthGraphNode>(500).strength(0.01))
      .force('y', forceY<AuthGraphNode>(500).strength(0.01))
      .on('tick', () => {
        graph.nodes.forEach(node => {
          const deltaX = (node.x ?? 500) - 500;
          const deltaY = (node.y ?? 500) - 500;

          node.vx = (node.vx ?? 0) - deltaY * node.orbitSpeed * 0.01;
          node.vy = (node.vy ?? 0) + deltaX * node.orbitSpeed * 0.01;
        });

        if (frameRef.current !== null) {
          return;
        }

        frameRef.current = window.requestAnimationFrame(() => {
          frameRef.current = null;
          setRenderTick(tick => tick + 1);
        });
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
      simulationRef.current = null;

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [graph.edges, graph.nodes, isEnabled]);

  if (!isEnabled) {
    return null;
  }

  void renderTick;

  return (
    <svg
      aria-hidden="true"
      className="auth-graph-field"
      data-testid="auth-graph-field"
      viewBox="0 0 1000 1000"
    >
      <g className="auth-graph-rotor">
        {graph.edges.map(edge => {
          const source = typeof edge.source === 'object' ? edge.source : graph.nodes[edge.source];
          const target = typeof edge.target === 'object' ? edge.target : graph.nodes[edge.target];

          return (
            <line
              key={edge.id}
              stroke="hsl(207 54% 75%)"
              strokeLinecap="round"
              strokeOpacity="0.72"
              strokeWidth="2.6"
              x1={source.x ?? 500}
              x2={target.x ?? 500}
              y1={source.y ?? 500}
              y2={target.y ?? 500}
            />
          );
        })}
        {graph.nodes.map(node => (
          <circle
            cx={node.x ?? 500}
            cy={node.y ?? 500}
            fill={node.fill}
            key={node.id}
            r={node.radius}
          />
        ))}
      </g>
    </svg>
  );
}
