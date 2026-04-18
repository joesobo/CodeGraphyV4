import type { BuildSharedGraphPropsOptions } from './rendering/surface/sharedProps';
import type { UseGraphInteractionRuntimeResult } from './runtime/use/interaction';
import type { UseGraphStateResult } from './runtime/use/state';
import type { DagMode } from '../../../shared/settings/modes';

export function buildGraphSharedPropsOptions({
  containerSize,
  dagMode,
  damping,
  graphData,
  handleEngineStop,
  interactions,
  timelineActive,
}: {
  containerSize: { width: number; height: number };
  dagMode: DagMode;
  damping: number;
  graphData: UseGraphStateResult['graphData'];
  handleEngineStop(this: void): void;
  interactions: UseGraphInteractionRuntimeResult;
  timelineActive: boolean;
}): BuildSharedGraphPropsOptions {
  return {
    containerSize,
    dagMode,
    damping,
    graphData,
    onBackgroundClick: interactions.interactionHandlers.handleBackgroundClick,
    onBackgroundRightClick: interactions.handleBackgroundRightClick,
    onEngineStop: handleEngineStop,
    onLinkClick: interactions.interactionHandlers.handleLinkClick,
    onLinkRightClick: interactions.handleLinkRightClick,
    onNodeClick: interactions.interactionHandlers.handleNodeClick,
    onNodeHover: interactions.handleNodeHover,
    onNodeRightClick: interactions.handleNodeRightClick,
    timelineActive,
  };
}
