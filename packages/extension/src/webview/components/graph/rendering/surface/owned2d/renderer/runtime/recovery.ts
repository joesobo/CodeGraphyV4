import { disposeCurrentRenderer, pauseOwnedGraphRendererPhysics, reportOwnedGraphRendererError } from './activation';
import type { OwnedGraphRendererLifecycleRuntime } from './lifecycle';

export function recoverOwnedGraphRenderer(
  runtime: OwnedGraphRendererLifecycleRuntime,
  message: string,
  attempts: number,
  restart: () => void,
): number {
  disposeCurrentRenderer(runtime);
  pauseOwnedGraphRendererPhysics(runtime);
  if (attempts >= 2) {
    reportOwnedGraphRendererError(runtime, message, true);
    return attempts;
  }
  runtime.onRecovering();
  restart();
  return attempts + 1;
}
