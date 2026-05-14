import type { GraphViewStoreState } from '../view/store';
import type { GraphContextMutationAvailability } from './contracts';

export function getGraphContextMutationAvailability(
  viewState: Pick<GraphViewStoreState, 'currentCommitSha' | 'timelineActive' | 'timelineCommits'>,
): GraphContextMutationAvailability {
  if (!viewState.timelineActive) {
    return 'enabled';
  }

  const currentHeadSha = viewState.timelineCommits.at(-1)?.sha;
  return currentHeadSha && viewState.currentCommitSha === currentHeadSha
    ? 'enabled'
    : 'disabled';
}
