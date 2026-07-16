import { GraphNodeFlag, type GraphLayoutState } from './contracts';

type LinkDegreeState = Pick<
  GraphLayoutState,
  'edgeSources' | 'edgeTargets' | 'flags' | 'linkDegrees'
>;

export function updateVisibleLinkDegrees(state: LinkDegreeState): void {
  state.linkDegrees.fill(0);
  for (let edge = 0; edge < state.edgeSources.length; edge += 1) {
    const source = state.edgeSources[edge];
    const target = state.edgeTargets[edge];
    if (
      (state.flags[source] & GraphNodeFlag.Hidden) !== 0
      || (state.flags[target] & GraphNodeFlag.Hidden) !== 0
    ) continue;
    state.linkDegrees[source] += 1;
    state.linkDegrees[target] += 1;
  }
}
