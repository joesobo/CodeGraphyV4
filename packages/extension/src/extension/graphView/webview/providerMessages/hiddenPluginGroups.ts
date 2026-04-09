import type {
  GraphViewProviderMessageListenerDependencies,
} from './listener';
import { getCodeGraphyConfiguration } from '../../../repoSettings/current';

export function updateHiddenPluginGroups(
  _dependencies: GraphViewProviderMessageListenerDependencies,
  groupIds: string[],
): Promise<void> {
  return Promise.resolve(getCodeGraphyConfiguration().update('hiddenPluginGroups', groupIds));
}
