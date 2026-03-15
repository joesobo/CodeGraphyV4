import type { GraphViewPrimaryMessageContext } from './dispatchPrimary';
import type { GraphViewNodeFileHandlers } from './nodeFile';

export function createGraphViewPrimaryNodeFileHandlers(
  context: GraphViewPrimaryMessageContext,
): GraphViewNodeFileHandlers {
  return {
    ...context,
    timelineActive: context.getTimelineActive(),
    currentCommitSha: context.getCurrentCommitSha(),
  };
}
