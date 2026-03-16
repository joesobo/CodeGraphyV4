import type { GraphViewPrimaryMessageContext } from './primary';
import type { GraphViewNodeFileHandlers } from '../nodeFile';

export function createGraphViewPrimaryNodeFileHandlers(
  context: GraphViewPrimaryMessageContext,
): GraphViewNodeFileHandlers {
  return {
    ...context,
    timelineActive: context.getTimelineActive(),
    currentCommitSha: context.getCurrentCommitSha(),
  };
}
