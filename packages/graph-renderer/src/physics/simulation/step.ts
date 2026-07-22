import type {
  GraphLayoutExternalForce,
  GraphLayoutExternalForceFinalization,
  GraphLayoutState,
} from '../contracts';
import type { GraphEngineState } from '../engine/state';

function maximumGraphVelocity(graph: GraphLayoutState): number {
  let maximum = 0;
  for (let index = 0; index < graph.vx.length; index += 1) {
    maximum = Math.max(maximum, Math.hypot(graph.vx[index], graph.vy[index]));
  }
  return maximum;
}

function externalForceFailure(error: unknown): Error {
  if (error instanceof Error) return error;
  const wrapped = new Error('External graph force failed') as Error & { cause?: unknown };
  wrapped.cause = error;
  return wrapped;
}

interface ExternalForceResult {
  error?: unknown;
  finalization?: GraphLayoutExternalForceFinalization;
}

function applyOwnedForces(state: GraphEngineState): void {
  state.alpha += (state.alphaTarget - state.alpha) * state.config.alphaDecay;
  state.kernel.applyForces(state.alpha);
  state.graph = state.kernel.state;
}

function applyExternalForce(
  state: GraphEngineState,
  externalForce: GraphLayoutExternalForce | undefined,
): unknown {
  try {
    externalForce?.beforeIntegration(state.alpha);
    return undefined;
  } catch (error) {
    return error;
  }
}

function collisionIterations(state: GraphEngineState): number {
  return state.alpha < 0.1
    ? Math.max(state.config.collisionIterations, 16)
    : state.config.collisionIterations;
}

function integrateOwnedForces(state: GraphEngineState): number {
  const maximumVelocity = state.kernel.integrate(collisionIterations(state));
  state.graph = state.kernel.state;
  return maximumVelocity;
}

function finalizeExternalForce(
  externalForce: GraphLayoutExternalForce | undefined,
  priorError: unknown,
): ExternalForceResult {
  try {
    return { error: priorError, finalization: externalForce?.afterIntegration?.() };
  } catch (error) {
    return {
      error: priorError ?? error,
      finalization: { positionChanged: true },
    };
  }
}

function updateSettlement(
  state: GraphEngineState,
  maximumVelocity: number,
  finalization: GraphLayoutExternalForceFinalization | undefined,
): void {
  const calm = state.alpha <= state.config.alphaMinimum
    && !finalization?.positionChanged
    && maximumVelocity <= state.config.settleSpeed
    && state.kernel.collisionCorrectionCount === 0;
  state.settledStepCount = calm ? state.settledStepCount + 1 : 0;
  state.settled = state.settledStepCount >= state.config.settleSteps;
}

export function stepSimulation(
  state: GraphEngineState,
  externalForce?: GraphLayoutExternalForce,
): void {
  applyOwnedForces(state);
  const forceError = applyExternalForce(state, externalForce);
  const kernelMaximumVelocity = integrateOwnedForces(state);
  const result = finalizeExternalForce(externalForce, forceError);
  const maximumVelocity = externalForce?.afterIntegration
    ? maximumGraphVelocity(state.graph)
    : kernelMaximumVelocity;
  updateSettlement(state, maximumVelocity, result.finalization);
  if (result.error !== undefined) throw externalForceFailure(result.error);
}
