import type { GraphViewProviderMessageListenerSource } from '../listener';
import type { GraphViewProviderPrimaryActions } from './types';

type StateActions = Pick<
  GraphViewProviderPrimaryActions,
  | 'undo'
  | 'redo'
  | 'setDepthMode'
  | 'setDepthLimit'
  | 'sendPhysicsSettings'
  | 'updatePhysicsSetting'
  | 'resetPhysicsSettings'
>;

export function createStateActions(source: GraphViewProviderMessageListenerSource): StateActions {
  return {
    undo: () => source.undo(),
    redo: () => source.redo(),
    setDepthMode: depthMode => source.setDepthMode(depthMode),
    setDepthLimit: depthLimit => source.setDepthLimit(depthLimit),
    sendPhysicsSettings: () => source._sendPhysicsSettings(),
    updatePhysicsSetting: (key, value) => source._updatePhysicsSetting(key, value),
    resetPhysicsSettings: () => source._resetPhysicsSettings(),
  };
}
