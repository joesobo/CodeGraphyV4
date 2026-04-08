import type {
  GraphViewProviderMessageListenerDependencies,
} from './listener';

export function updateHiddenPluginGroups(
  dependencies: GraphViewProviderMessageListenerDependencies,
  groupIds: string[],
): Promise<void> {
  const configuration = dependencies.workspace.getConfiguration('codegraphy');
  const target = dependencies.getConfigTarget(dependencies.workspace.workspaceFolders);
  return Promise.resolve(configuration.update('hiddenPluginGroups', groupIds, target));
}
