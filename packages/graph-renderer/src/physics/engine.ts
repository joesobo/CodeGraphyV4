import { DEFAULT_GRAPH_LAYOUT_CONFIG, mergeGraphLayoutConfig } from './config';
import type {
  GraphLayoutConfig,
  GraphLayoutEngine,
  GraphLayoutInput,
  GraphLayoutTickResult,
} from './contracts';
import { updateCollisionScale, updateEngineConfig } from './engineConfig';
import type { GraphEngineState } from './engineState';
import { createGraphStorage, replaceGraphStorage } from './graphStorage';
import { replaceKinematics } from './kinematics';
import { pinGraphNode, releaseGraphNode, setGraphNodePosition } from './nodeControl';
import { tickSimulation } from './simulation';
import { reheatSimulation, setSimulationAlphaTarget } from './simulationAlpha';

function createEngineState(
  input: GraphLayoutInput,
  update: Partial<GraphLayoutConfig>,
): GraphEngineState {
  const config = mergeGraphLayoutConfig(DEFAULT_GRAPH_LAYOUT_CONFIG, update);
  return {
    alpha: 1,
    alphaTarget: 0,
    collisionScale: 1,
    config,
    ...createGraphStorage(input, config, 1, 1),
    paused: false,
    settled: false,
    settledStepCount: 0,
  };
}

export class TypedGraphLayoutEngine implements GraphLayoutEngine {
  private readonly engine: GraphEngineState;

  constructor(input: GraphLayoutInput, config: Partial<GraphLayoutConfig> = {}) {
    this.engine = createEngineState(input, config);
  }

  get nodeIds(): readonly string[] { return this.engine.nodeIds; }
  get x(): Float32Array { return this.engine.graph.x; }
  get y(): Float32Array { return this.engine.graph.y; }
  get vx(): Float32Array { return this.engine.graph.vx; }
  get vy(): Float32Array { return this.engine.graph.vy; }
  get chargeStrengthMultipliers(): Float32Array {
    return this.engine.graph.chargeStrengthMultipliers;
  }
  get radii(): Float32Array { return this.engine.graph.radii; }
  get flags(): Uint8Array { return this.engine.graph.flags; }
  get edgeSources(): Uint32Array { return this.engine.graph.edgeSources; }
  get edgeTargets(): Uint32Array { return this.engine.graph.edgeTargets; }
  get alpha(): number { return this.engine.alpha; }
  get settled(): boolean { return this.engine.settled; }

  getNodeIndex(nodeId: string): number | undefined {
    return this.engine.nodeIndexes.get(nodeId);
  }

  setGraph(input: GraphLayoutInput): void {
    replaceGraphStorage(this.engine, input);
  }

  setConfig(config: Partial<GraphLayoutConfig>): void {
    if (updateEngineConfig(this.engine, config)) this.reheat(0.3);
  }

  setCollisionScale(scale: number): void {
    updateCollisionScale(this.engine, scale);
  }

  tick(): GraphLayoutTickResult {
    return tickSimulation(this.engine);
  }

  setKinematics(x: Float32Array, y: Float32Array, vx: Float32Array, vy: Float32Array): void {
    replaceKinematics(this.engine, x, y, vx, vy);
  }

  setNodePosition(index: number, x: number, y: number): void {
    setGraphNodePosition(this.engine, index, x, y);
  }

  pin(index: number): void { pinGraphNode(this.engine, index); }
  release(index: number): void { releaseGraphNode(this.engine, index); }
  setAlphaTarget(alpha: number): void { setSimulationAlphaTarget(this.engine, alpha); }
  reheat(alpha = 1): void { reheatSimulation(this.engine, alpha); }
  pause(): void { this.engine.paused = true; }
  resume(): void { this.engine.paused = false; }
}

export function createGraphLayoutEngine(
  input: GraphLayoutInput,
  config: Partial<GraphLayoutConfig> = {},
): GraphLayoutEngine {
  return new TypedGraphLayoutEngine(input, config);
}
