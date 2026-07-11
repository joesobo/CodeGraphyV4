import { useEffect, useRef, useState } from 'react';
import type { FGNode } from '../../components/graph/model/build';
import {
  createFrameMetrics,
  type FrameMetrics,
} from '../frameMetrics';
import {
  webviewPerfBridge,
  type WebviewPerfBridge,
} from '../bridge';
import {
  webviewGraphPerfControl,
  type WebviewGraphPerfControl,
} from './control';
import {
  runDeterministicInteractionBurst,
  type DeterministicInteractionBurstOptions,
} from './interaction';
import {
  createGraphPerfScenarios,
  type GraphPerfScenarios,
} from './scenarios';

interface GraphPerfScenarioOptions {
  getContainer: () => HTMLDivElement | null;
  getGraph: () => { d3ReheatSimulation?: () => void } | undefined;
  getNodes: () => readonly FGNode[];
  graphMode: '2d' | '3d';
  handleNodeDrag: (node: FGNode, translate: { x: number; y: number }) => void;
  handleNodeDragEnd: (node: FGNode) => void;
  simulationEnabled?: boolean;
  zoomGraphView: (factor: number) => void;
}

interface UseGraphPerfScenariosDependencies {
  bridge: Pick<WebviewPerfBridge, 'emitFor'>;
  cancelFrame: (frame: number) => void;
  clearTimer: (timer: number) => void;
  control: Pick<WebviewGraphPerfControl, 'attachTarget'>;
  frameMetrics?: FrameMetrics;
  now: () => number;
  requestFrame: (callback: FrameRequestCallback) => number;
  setTimer: (callback: () => void, durationMs: number) => number;
}

const defaultDependencies: UseGraphPerfScenariosDependencies = {
  bridge: webviewPerfBridge,
  cancelFrame: frame => cancelAnimationFrame(frame),
  clearTimer: timer => clearTimeout(timer),
  control: webviewGraphPerfControl,
  now: () => performance.now(),
  requestFrame: callback => requestAnimationFrame(callback),
  setTimer: (callback, durationMs) => window.setTimeout(callback, durationMs),
};

export function useGraphPerfScenarios(
  options: GraphPerfScenarioOptions,
  dependencies: UseGraphPerfScenariosDependencies = defaultDependencies,
): (() => void) | undefined {
  const optionsRef = useRef<GraphPerfScenarioOptions>(options);
  optionsRef.current = options;
  const [tickEnabled, setTickEnabled] = useState(false);
  const scenariosRef = useRef<GraphPerfScenarios | null>(null);
  const frameMetricsRef = useRef<FrameMetrics | null>(null);

  if (!frameMetricsRef.current) {
    frameMetricsRef.current = dependencies.frameMetrics ?? createFrameMetrics();
  }

  if (!scenariosRef.current) {
    scenariosRef.current = createGraphPerfScenarios({
      bridge: dependencies.bridge,
      cancelFrame: dependencies.cancelFrame,
      clearTimer: dependencies.clearTimer,
      frameMetrics: frameMetricsRef.current,
      now: dependencies.now,
      requestFrame: dependencies.requestFrame,
      runInteractionBurst: () => {
        const current = optionsRef.current;
        const interactionOptions: DeterministicInteractionBurstOptions = {
          container: current.getContainer(),
          graph: current.getGraph(),
          graphMode: current.graphMode,
          handleNodeDrag: current.handleNodeDrag,
          handleNodeDragEnd: current.handleNodeDragEnd,
          nodes: current.getNodes(),
          simulationEnabled: current.simulationEnabled !== false,
          zoomGraphView: current.zoomGraphView,
        };
        return runDeterministicInteractionBurst(interactionOptions);
      },
      setTickEnabled,
      setTimer: dependencies.setTimer,
    });
  }
  const scenarios = scenariosRef.current;

  useEffect(
    () => dependencies.control.attachTarget(scenarios),
    [dependencies.control, scenarios],
  );

  return tickEnabled ? scenarios.engineTick : undefined;
}
