import { getCodeGraphyConfiguration } from '../../../repoSettings/current';
import type {
  GraphViewProviderMessageListenerDependencies,
} from './listener';

export function updateHiddenPluginGroups(
  _dependencies: GraphViewProviderMessageListenerDependencies,
  groupIds: string[],
): Promise<void> {
  return getCodeGraphyConfiguration().update('hiddenPluginGroups', groupIds);
}
