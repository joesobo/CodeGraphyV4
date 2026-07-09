import type {
  PerfEventInput,
  PerfOperation,
} from '../../../shared/perf/protocol';
import type { FrameMetrics } from '../frameMetrics';

export const DEFAULT_IDLE_WATCH_DURATION_MS = 60_000;

interface ScenarioPerfBridge {
  emitFor: (operation: PerfOperation, event: PerfEventInput) => boolean;
}

interface GraphPerfScenarioDependencies {
  bridge: ScenarioPerfBridge;
  cancelFrame: (frame: number) => void;
  clearTimer: (timer: number) => void;
  frameMetrics: FrameMetrics;
  now: () => number;
  requestFrame: (callback: FrameRequestCallback) => number;
  runInteractionBurst: () => { waitForSettle: boolean };
  setTickEnabled: (enabled: boolean) => void;
  setTimer: (callback: () => void, durationMs: number) => number;
}

export interface GraphPerfScenarios {
  cancel: () => void;
  engineStopped: () => void;
  engineTick: () => void;
  startIdleWatch: (operation: PerfOperation, durationMs: number) => void;
  startInteractionBurst: (operation: PerfOperation) => void;
}

interface InteractionState {
  burstRan: boolean;
  frameReady: boolean;
  operation: PerfOperation;
  settled: boolean;
  startedAt: number;
}

interface IdleState {
  durationMs: number;
  operation: PerfOperation;
  startedAt: number | undefined;
  ticks: number;
}

export function createGraphPerfScenarios({
  bridge,
  cancelFrame,
  clearTimer,
  frameMetrics,
  now,
  requestFrame,
  runInteractionBurst,
  setTickEnabled,
  setTimer,
}: GraphPerfScenarioDependencies): GraphPerfScenarios {
  let frame: number | undefined;
  let timer: number | undefined;
  let graphSettled = false;
  let interaction: InteractionState | undefined;
  let idle: IdleState | undefined;

  const clearScheduledWork = (): void => {
    if (frame !== undefined) {
      cancelFrame(frame);
      frame = undefined;
    }
    if (timer !== undefined) {
      clearTimer(timer);
      timer = undefined;
    }
    interaction = undefined;
    idle = undefined;
    setTickEnabled(false);
    frameMetrics.cancel();
  };

  const completeInteractionIfReady = (state: InteractionState): void => {
    if (interaction !== state || !state.frameReady || !state.settled) {
      return;
    }

    frameMetrics.completeInteraction(state.operation);
    bridge.emitFor(state.operation, {
      kind: 'interaction-complete',
      interaction: 'burst',
      durationMs: Math.max(0, now() - state.startedAt),
    });
    interaction = undefined;
  };

  const finishIdle = (state: IdleState): void => {
    if (idle !== state || state.startedAt === undefined) {
      return;
    }

    timer = undefined;
    setTickEnabled(false);
    frameMetrics.completeIdle(state.operation);
    bridge.emitFor(state.operation, {
      kind: 'metric',
      metric: 'simTicksAfterSettle',
      unit: 'count',
      value: state.ticks,
    });
    bridge.emitFor(state.operation, {
      kind: 'idle-complete',
      durationMs: Math.max(0, now() - state.startedAt),
    });
    idle = undefined;
  };

  const beginIdleIfSettled = (state: IdleState): void => {
    if (idle !== state || !graphSettled || state.startedAt !== undefined) {
      return;
    }

    state.startedAt = now();
    frameMetrics.startIdle(state.operation);
    timer = setTimer(() => finishIdle(state), state.durationMs);
  };

  return {
    cancel: clearScheduledWork,

    engineStopped(): void {
      graphSettled = true;
      if (interaction?.burstRan) {
        interaction.settled = true;
        completeInteractionIfReady(interaction);
      }
      if (idle) {
        beginIdleIfSettled(idle);
      }
    },

    engineTick(): void {
      if (idle?.startedAt !== undefined) {
        idle.ticks += 1;
      }
    },

    startIdleWatch(operation, durationMs): void {
      clearScheduledWork();
      const state: IdleState = {
        durationMs,
        operation,
        startedAt: undefined,
        ticks: 0,
      };
      idle = state;
      setTickEnabled(true);
      beginIdleIfSettled(state);
    },

    startInteractionBurst(operation): void {
      clearScheduledWork();
      graphSettled = false;
      const state: InteractionState = {
        burstRan: false,
        frameReady: false,
        operation,
        settled: false,
        startedAt: now(),
      };
      interaction = state;
      frameMetrics.startInteraction(operation);
      frame = requestFrame(() => {
        if (interaction !== state) {
          return;
        }
        frame = undefined;
        const result = runInteractionBurst();
        frameMetrics.startSettle(operation);
        state.burstRan = true;
        state.settled = !result.waitForSettle;
        frame = requestFrame(() => {
          if (interaction !== state) {
            return;
          }
          frame = undefined;
          state.frameReady = true;
          completeInteractionIfReady(state);
        });
      });
    },
  };
}
