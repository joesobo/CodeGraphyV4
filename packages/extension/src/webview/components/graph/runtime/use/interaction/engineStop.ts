import {
  webviewGraphPerfLifecycle,
  type GraphPerfLifecycle,
} from '../../../../../perf/graph/lifecycle';
import {
  webviewGraphPerfControl,
  type WebviewGraphPerfControl,
} from '../../../../../perf/graph/control';

type PhysicsStabilizedMessage = {
  type: 'PHYSICS_STABILIZED';
};

type PhysicsStabilizedMessageSender = (message: PhysicsStabilizedMessage) => void;

export function postPhysicsStabilized(
  sendMessage: PhysicsStabilizedMessageSender,
  perfLifecycle: Pick<GraphPerfLifecycle, 'engineStopped'> = webviewGraphPerfLifecycle,
  perfControl: Pick<WebviewGraphPerfControl, 'engineStopped'> = webviewGraphPerfControl,
): void {
  perfLifecycle.engineStopped();
  perfControl.engineStopped();
  sendMessage({ type: 'PHYSICS_STABILIZED' });
}
