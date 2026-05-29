import type { GraphViewProviderMessageListenerSource } from '../listener';
import type { GraphViewProviderPrimaryActions } from './types';

type TimelineActions = Pick<
  GraphViewProviderPrimaryActions,
  | 'undo'
  | 'redo'
  | 'setDepthMode'
  | 'setDepthLimit'
  | 'indexRepository'
  | 'jumpToCommit'
  | 'resetTimeline'
  | 'sendPhysicsSettings'
  | 'updatePhysicsSetting'
  | 'resetPhysicsSettings'
>;

export function createTimelineActions(
  source: GraphViewProviderMessageListenerSource,
): TimelineActions {
  return {
    undo: () => source.undo(),
    redo: () => source.redo(),
    setDepthMode: depthMode => source.setDepthMode(depthMode),
    setDepthLimit: depthLimit => source.setDepthLimit(depthLimit),
    indexRepository: () => source._indexRepository(),
    jumpToCommit: sha => source._jumpToCommit(sha),
    resetTimeline: () => source._resetTimeline(),
    sendPhysicsSettings: () => source._sendPhysicsSettings(),
    updatePhysicsSetting: (key, value) => source._updatePhysicsSetting(key, value),
    resetPhysicsSettings: () => source._resetPhysicsSettings(),
  };
}
