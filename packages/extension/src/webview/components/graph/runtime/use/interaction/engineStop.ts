import {
  webviewGraphPerfLifecycle,
  type GraphPerfLifecycle,
} from '../../../../../perf/graph/lifecycle';
import {
  webviewGraphPerfControl,
  type WebviewGraphPerfControl,
} from '../../../../../perf/graph/control';
import {
  webviewRenderReadyControl,
  type WebviewRenderReadyControl,
} from '../../../../../perf/renderReady/control';

type PhysicsStabilizedMessage = {
  type: 'PHYSICS_STABILIZED';
};

type PhysicsStabilizedMessageSender = (message: PhysicsStabilizedMessage) => void;

export function postPhysicsStabilized(
  sendMessage: PhysicsStabilizedMessageSender,
  perfLifecycle: Pick<GraphPerfLifecycle, 'engineStopped'> = webviewGraphPerfLifecycle,
  perfControl: Pick<WebviewGraphPerfControl, 'engineStopped'> = webviewGraphPerfControl,
  renderReadyControl: Pick<
    WebviewRenderReadyControl,
    'engineStopped'
  > = webviewRenderReadyControl,
): void {
  perfLifecycle.engineStopped();
  perfControl.engineStopped();
  renderReadyControl.engineStopped();
  sendMessage({ type: 'PHYSICS_STABILIZED' });
}
