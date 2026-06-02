'use client';

import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type ForceCenter,
  type ForceCollide,
  type ForceLink,
  type ForceManyBody,
  type ForceX,
  type ForceY,
  type Simulation,
} from 'd3-force';
import { useEffect, useId, useRef, useState } from 'react';
import {
  EDGE_FEATHER,
  EDGE_NODE_GAP,
  createForceEdges,
  createForceNodes,
  createVisibleEdgeSegment,
  forceNodeCollisionRadius,
  getForceLinkDistance,
  limitForceNodeVelocity,
  readForceSectionRects,
  separateOverlappingForceNodes,
  type ForceEdge,
  type ForceNode,
  type MaskRect,
  type Viewport,
} from './model';
import { useForceNodeSettings } from './settings';

function supportsDesktopMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(min-width: 768px)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getViewport(): Viewport {
  return {
    height: window.innerHeight,
    width: window.innerWidth,
  };
}

function sameViewport(left: Viewport | null, right: Viewport): boolean {
  return left?.height === right.height && left.width === right.width;
}

function resolveEdgeEndpoint(endpoint: ForceEdge['source'], nodes: ForceNode[]): ForceNode | undefined {
  if (typeof endpoint === 'object') {
    return endpoint;
  }

  return nodes.find(node => node.id === Number(endpoint));
}

function scaledNodeRadius(node: ForceNode, sizeMultiplier: number): number {
  return node.radius * sizeMultiplier;
}

function getVelocityLimit(sizeMultiplier: number): number {
  return Math.max(0.58, 2.1 / Math.sqrt(sizeMultiplier));
}

export function ForceNodeField(): React.ReactElement | null {
  const maskId = useId().replace(/:/g, '');
  const { normalizedSettings } = useForceNodeSettings();
  const [edges, setEdges] = useState<ForceEdge[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [maskRects, setMaskRects] = useState<MaskRect[]>([]);
  const [nodes, setNodes] = useState<ForceNode[]>([]);
  const [renderSizeMultiplier, setRenderSizeMultiplier] = useState(normalizedSettings.sizeMultiplier);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [, setFrame] = useState(0);
  const centerForceRef = useRef<ForceCenter<ForceNode> | null>(null);
  const chargeForceRef = useRef<ForceManyBody<ForceNode> | null>(null);
  const collisionForceRef = useRef<ForceCollide<ForceNode> | null>(null);
  const linkForceRef = useRef<ForceLink<ForceNode, ForceEdge> | null>(null);
  const simulationRef = useRef<Simulation<ForceNode, ForceEdge> | null>(null);
  const xForceRef = useRef<ForceX<ForceNode> | null>(null);
  const yForceRef = useRef<ForceY<ForceNode> | null>(null);
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const tickFrameRef = useRef<number | null>(null);
  const calmTimeoutRef = useRef<number | null>(null);
  const normalizedSettingsRef = useRef(normalizedSettings);

  normalizedSettingsRef.current = normalizedSettings;

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
      setMaskRects([]);
      setViewport(null);
      return;
    }

    let pendingFrame: number | null = null;

    const updateGeometry = (): void => {
      pendingFrame = null;
      const nextViewport = getViewport();

      setViewport(current => (sameViewport(current, nextViewport) ? current : nextViewport));
      setMaskRects(readForceSectionRects(nextViewport));
    };

    const scheduleGeometryUpdate = (): void => {
      if (pendingFrame !== null) {
        return;
      }

      pendingFrame = window.requestAnimationFrame(updateGeometry);
    };

    updateGeometry();
    window.addEventListener('resize', scheduleGeometryUpdate);
    window.addEventListener('scroll', scheduleGeometryUpdate, { passive: true });

    return () => {
      if (pendingFrame !== null) {
        window.cancelAnimationFrame(pendingFrame);
      }

      window.removeEventListener('resize', scheduleGeometryUpdate);
      window.removeEventListener('scroll', scheduleGeometryUpdate);
    };
  }, [isEnabled]);

  useEffect(() => {
    if (!isEnabled || viewport === null) {
      simulationRef.current?.stop();
      simulationRef.current = null;
      setEdges([]);
      setNodes([]);
      return;
    }

    const forceNodes = createForceNodes(viewport);
    const forceEdges = createForceEdges(forceNodes);
    pointerTargetRef.current = {
      x: viewport.width * 0.68,
      y: viewport.height * 0.28,
    };
    setEdges(forceEdges);
    setNodes(forceNodes);

    const centerForce = forceCenter<ForceNode>(pointerTargetRef.current.x, pointerTargetRef.current.y).strength(0.025);
    const linkForce = forceLink<ForceNode, ForceEdge>(forceEdges)
      .id(node => node.id)
      .distance(edge => edge.distance)
      .strength(edge => edge.strength);
    const chargeForce = forceManyBody<ForceNode>().strength(-18);
    const collisionForce = forceCollide<ForceNode>().radius(node => node.radius + 4).iterations(2);
    const xForce = forceX<ForceNode>(pointerTargetRef.current.x).strength(node => node.pull);
    const yForce = forceY<ForceNode>(pointerTargetRef.current.y).strength(node => node.pull);
    centerForceRef.current = centerForce;
    chargeForceRef.current = chargeForce;
    collisionForceRef.current = collisionForce;
    linkForceRef.current = linkForce;
    xForceRef.current = xForce;
    yForceRef.current = yForce;

    const simulation = forceSimulation<ForceNode, ForceEdge>(forceNodes)
      .alpha(0.72)
      .alphaTarget(0.035)
      .velocityDecay(0.31)
      .force('center', centerForce)
      .force('charge', chargeForce)
      .force('collision', collisionForce)
      .force('link', linkForce)
      .force('x', xForce)
      .force('y', yForce)
      .on('tick', () => {
        const currentSettings = normalizedSettingsRef.current;
        const currentNodes = simulation.nodes();

        separateOverlappingForceNodes(
          currentNodes,
          {
            collisionPadding: currentSettings.collisionPadding,
            sizeMultiplier: currentSettings.sizeMultiplier,
          },
          currentSettings.collisionIterations,
        );
        currentNodes.forEach(node => {
          limitForceNodeVelocity(node, getVelocityLimit(currentSettings.sizeMultiplier));
        });

        if (tickFrameRef.current !== null) {
          return;
        }

        tickFrameRef.current = window.requestAnimationFrame(() => {
          tickFrameRef.current = null;
          setFrame(frame => frame + 1);
        });
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
      simulationRef.current = null;
      centerForceRef.current = null;
      chargeForceRef.current = null;
      collisionForceRef.current = null;
      linkForceRef.current = null;
      xForceRef.current = null;
      yForceRef.current = null;

      if (tickFrameRef.current !== null) {
        window.cancelAnimationFrame(tickFrameRef.current);
        tickFrameRef.current = null;
      }
    };
  }, [isEnabled, viewport]);

  useEffect(() => {
    if (!isEnabled || viewport === null) {
      return;
    }

    const simulation = simulationRef.current;

    if (simulation === null) {
      return;
    }

    centerForceRef.current?.strength(normalizedSettings.centerStrength);
    chargeForceRef.current?.strength(normalizedSettings.repelStrength * normalizedSettings.sizeRepelMultiplier);
    collisionForceRef.current
      ?.radius(node => forceNodeCollisionRadius(node, normalizedSettings))
      .iterations(normalizedSettings.collisionIterations);
    linkForceRef.current
      ?.distance(edge => {
        const source = resolveEdgeEndpoint(edge.source, nodes);
        const target = resolveEdgeEndpoint(edge.target, nodes);
        if (source === undefined || target === undefined) {
          return edge.distance * normalizedSettings.distanceMultiplier * normalizedSettings.sizeDistanceMultiplier;
        }

        return getForceLinkDistance(edge.distance, source, target, normalizedSettings);
      })
      .strength(edge => edge.strength * normalizedSettings.linkStrengthMultiplier);
    xForceRef.current?.strength(node => node.pull * normalizedSettings.centerPullMultiplier);
    yForceRef.current?.strength(node => node.pull * normalizedSettings.centerPullMultiplier);
    separateOverlappingForceNodes(
      simulation.nodes(),
      {
        collisionPadding: normalizedSettings.collisionPadding,
        sizeMultiplier: normalizedSettings.sizeMultiplier,
      },
      normalizedSettings.collisionIterations,
    );

    simulation.alpha(Math.max(simulation.alpha(), 0.48)).alphaTarget(0.18).restart();

    const calmTimeout = window.setTimeout(() => {
      if (simulationRef.current === simulation) {
        simulation.alphaTarget(0.035);
      }
    }, 520);

    return () => {
      window.clearTimeout(calmTimeout);
    };
  }, [
    isEnabled,
    normalizedSettings.centerPullMultiplier,
    normalizedSettings.centerStrength,
    normalizedSettings.collisionIterations,
    normalizedSettings.collisionPadding,
    normalizedSettings.distanceMultiplier,
    normalizedSettings.linkStrengthMultiplier,
    normalizedSettings.repelStrength,
    normalizedSettings.sizeDistanceMultiplier,
    normalizedSettings.sizeMultiplier,
    normalizedSettings.sizeRepelMultiplier,
    nodes,
    viewport,
  ]);

  useEffect(() => {
    if (!isEnabled) {
      setRenderSizeMultiplier(normalizedSettings.sizeMultiplier);
      return;
    }

    let frame: number | null = null;
    const targetSize = normalizedSettings.sizeMultiplier;

    const stepTowardTarget = (): void => {
      setRenderSizeMultiplier(currentSize => {
        if (targetSize <= currentSize) {
          return targetSize;
        }

        const nextSize = Math.min(targetSize, currentSize + Math.max(0.035, (targetSize - currentSize) * 0.04));

        if (nextSize < targetSize) {
          frame = window.requestAnimationFrame(stepTowardTarget);
        }

        return nextSize;
      });
    };

    frame = window.requestAnimationFrame(stepTowardTarget);

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [isEnabled, normalizedSettings.sizeMultiplier]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const handleMouseMove = (event: MouseEvent): void => {
      pointerTargetRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
      centerForceRef.current?.x(event.clientX).y(event.clientY);
      xForceRef.current?.x(event.clientX);
      yForceRef.current?.y(event.clientY);

      const simulation = simulationRef.current;

      if (simulation === null) {
        return;
      }

      simulation.nodes().forEach((node, index) => {
        const currentSettings = normalizedSettingsRef.current;
        const mouseImpulse = 0.22 / Math.sqrt(currentSettings.sizeMultiplier);

        node.vx = (node.vx ?? 0) + Math.sin(event.clientY * 0.018 + index) * mouseImpulse;
        node.vy = (node.vy ?? 0) + Math.cos(event.clientX * 0.018 + index) * mouseImpulse;
        limitForceNodeVelocity(node, getVelocityLimit(currentSettings.sizeMultiplier));
      });
      separateOverlappingForceNodes(
        simulation.nodes(),
        {
          collisionPadding: normalizedSettingsRef.current.collisionPadding,
          sizeMultiplier: normalizedSettingsRef.current.sizeMultiplier,
        },
        normalizedSettingsRef.current.collisionIterations,
      );

      simulation.alphaTarget(0.2).restart();

      if (calmTimeoutRef.current !== null) {
        window.clearTimeout(calmTimeoutRef.current);
      }

      calmTimeoutRef.current = window.setTimeout(() => {
        simulation.alphaTarget(0.035);
      }, 360);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);

      if (calmTimeoutRef.current !== null) {
        window.clearTimeout(calmTimeoutRef.current);
        calmTimeoutRef.current = null;
      }
    };
  }, [isEnabled]);

  if (!isEnabled || viewport === null || !supportsDesktopMotion()) {
    return null;
  }

  const maskElementId = `${maskId}-force-mask`;
  const blurElementId = `${maskId}-force-mask-blur`;
  const edgeCutoutMaskId = `${maskId}-edge-cutout-mask`;
  const viewportFadeMaskId = `${maskId}-viewport-fade-mask`;
  const topFadeId = `${maskId}-top-edge-fade`;
  const bottomFadeId = `${maskId}-bottom-edge-fade`;
  const leftFadeId = `${maskId}-left-edge-fade`;
  const rightFadeId = `${maskId}-right-edge-fade`;
  const viewportEdgeFeather = Math.min(120, viewport.width * 0.1, viewport.height * 0.18);

  return (
    <svg
      aria-hidden="true"
      className="force-node-field"
      data-testid="force-node-field"
      height={viewport.height}
      viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      width={viewport.width}
    >
      <defs>
        <linearGradient gradientUnits="userSpaceOnUse" id={topFadeId} x1="0" x2="0" y1="0" y2={viewportEdgeFeather}>
          <stop offset="0%" stopColor="black" />
          <stop offset="100%" stopColor="white" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id={bottomFadeId}
          x1="0"
          x2="0"
          y1={viewport.height - viewportEdgeFeather}
          y2={viewport.height}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </linearGradient>
        <linearGradient gradientUnits="userSpaceOnUse" id={leftFadeId} x1="0" x2={viewportEdgeFeather} y1="0" y2="0">
          <stop offset="0%" stopColor="black" />
          <stop offset="100%" stopColor="white" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id={rightFadeId}
          x1={viewport.width - viewportEdgeFeather}
          x2={viewport.width}
          y1="0"
          y2="0"
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </linearGradient>
        <filter
          filterUnits="userSpaceOnUse"
          height={viewport.height + EDGE_FEATHER * 4}
          id={blurElementId}
          width={viewport.width + EDGE_FEATHER * 4}
          x={-EDGE_FEATHER * 2}
          y={-EDGE_FEATHER * 2}
        >
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <mask id={maskElementId} maskUnits="userSpaceOnUse">
          <rect fill="black" height={viewport.height} width={viewport.width} x="0" y="0" />
          <g filter={`url(#${blurElementId})`}>
            {maskRects.map((rect, index) => (
              <rect
                fill="white"
                height={rect.height + EDGE_FEATHER}
                key={`${index}-${Math.round(rect.y)}`}
                width={rect.width + EDGE_FEATHER}
                x={rect.x - EDGE_FEATHER / 2}
                y={rect.y - EDGE_FEATHER / 2}
              />
            ))}
          </g>
        </mask>
        <mask id={edgeCutoutMaskId} maskUnits="userSpaceOnUse">
          <rect fill="white" height={viewport.height} width={viewport.width} x="0" y="0" />
          {nodes.map(node => (
            <circle
              cx={node.x ?? pointerTargetRef.current.x}
              cy={node.y ?? pointerTargetRef.current.y}
              fill="black"
              key={node.id}
              r={scaledNodeRadius(node, renderSizeMultiplier) + EDGE_NODE_GAP}
            />
          ))}
        </mask>
        <mask id={viewportFadeMaskId} maskUnits="userSpaceOnUse">
          <rect fill="white" height={viewport.height} width={viewport.width} x="0" y="0" />
          <rect fill={`url(#${topFadeId})`} height={viewportEdgeFeather} width={viewport.width} x="0" y="0" />
          <rect
            fill={`url(#${bottomFadeId})`}
            height={viewportEdgeFeather}
            width={viewport.width}
            x="0"
            y={viewport.height - viewportEdgeFeather}
          />
          <rect fill={`url(#${leftFadeId})`} height={viewport.height} width={viewportEdgeFeather} x="0" y="0" />
          <rect
            fill={`url(#${rightFadeId})`}
            height={viewport.height}
            width={viewportEdgeFeather}
            x={viewport.width - viewportEdgeFeather}
            y="0"
          />
        </mask>
      </defs>
      <g mask={`url(#${viewportFadeMaskId})`}>
        <g mask={`url(#${maskElementId})`}>
        <g mask={`url(#${edgeCutoutMaskId})`}>
          {edges.map(edge => {
            const source = resolveEdgeEndpoint(edge.source, nodes);
            const target = resolveEdgeEndpoint(edge.target, nodes);

            if (source === undefined || target === undefined) {
              return null;
            }

            const segment = createVisibleEdgeSegment(
              source,
              target,
              pointerTargetRef.current,
              EDGE_NODE_GAP,
              renderSizeMultiplier,
            );

            if (segment === null) {
              return null;
            }

            return (
              <line
                key={edge.id}
                stroke="hsl(207 83% 48%)"
                strokeLinecap="round"
                strokeOpacity={edge.opacity}
                strokeWidth={edge.width}
                x1={segment.x1}
                x2={segment.x2}
                y1={segment.y1}
                y2={segment.y2}
              />
            );
          })}
        </g>
        {nodes.map(node => (
          <circle
            cx={node.x ?? pointerTargetRef.current.x}
            cy={node.y ?? pointerTargetRef.current.y}
            fill={node.fill}
            fillOpacity={node.opacity}
            key={node.id}
            r={scaledNodeRadius(node, renderSizeMultiplier)}
            stroke={node.stroke}
            strokeWidth="1"
          />
        ))}
        </g>
      </g>
    </svg>
  );
}
