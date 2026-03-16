import type { GraphViewPrimaryMessageContext } from './primary';
import type { GraphViewGroupMessageState } from '../groups';

export function createGraphViewPrimaryGroupMessageState(
  context: GraphViewPrimaryMessageContext,
): GraphViewGroupMessageState {
  return {
    userGroups: context.getUserGroups(),
  };
}
