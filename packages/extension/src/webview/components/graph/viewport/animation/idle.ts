export interface GraphAnimationControls {
  pauseAnimation?(): void;
  resumeAnimation?(): void;
}

export interface IdleGraphAnimationController {
  activity(): void;
  dispose(): void;
  engineStopped(): void;
  engineTick(): void;
  graphChanged(simulationWillRun: boolean): void;
}

const interactionGraceMs = 500;
const renderGraceMs = 50;

export function createIdleGraphAnimationController(
  getGraph: () => GraphAnimationControls | undefined,
): IdleGraphAnimationController {
  let pauseTimer: ReturnType<typeof setTimeout> | undefined;

  const cancelPause = (): void => {
    if (pauseTimer === undefined) return;
    clearTimeout(pauseTimer);
    pauseTimer = undefined;
  };

  const schedulePause = (delayMs: number): void => {
    cancelPause();
    pauseTimer = setTimeout(() => {
      pauseTimer = undefined;
      getGraph()?.pauseAnimation?.();
    }, delayMs);
  };

  const resume = (): void => {
    getGraph()?.resumeAnimation?.();
  };

  return {
    activity: () => {
      resume();
      schedulePause(interactionGraceMs);
    },
    dispose: cancelPause,
    engineStopped: () => schedulePause(0),
    engineTick: cancelPause,
    graphChanged: (simulationWillRun) => {
      resume();
      if (simulationWillRun) {
        cancelPause();
      } else {
        schedulePause(renderGraceMs);
      }
    },
  };
}
