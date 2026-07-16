import { DEFAULT_GRAPH_LAYOUT_CONFIG, mergeGraphLayoutConfig } from '../config/model';
import type {
  GraphLayoutConfig,
  GraphLayoutEngine,
  GraphLayoutExternalForce,
  GraphLayoutInput,
  GraphLayoutTickResult,
} from '../contracts';
import { createGraphStorage, replaceGraphStorage } from '../graph/storage';
import { replaceKinematics } from '../node/kinematics';
import { pinGraphNode, releaseGraphNode, setGraphNodePosition } from '../node/control';
import { reheatSimulation, setSimulationAlphaTarget } from '../simulation/alpha';
import { tickSimulation } from '../simulation/runtime';
import { updateEngineConfig } from './configuration';
import type { GraphEngineState } from './state';

function createEngineState(
  input: GraphLayoutInput,
  update: Partial<GraphLayoutConfig>,
): GraphEngineState {
  const config = mergeGraphLayoutConfig(DEFAULT_GRAPH_LAYOUT_CONFIG, update);
  return {
    alpha: 1,
    alphaTarget: 0,
    config,
    ...createGraphStorage(input, config, 1),
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

  tick(externalForce?: GraphLayoutExternalForce): GraphLayoutTickResult {
    return tickSimulation(this.engine, externalForce);
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
