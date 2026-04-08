import type {
  GraphViewProviderMessageListenerDependencies,
} from './listener';

export function updateHiddenPluginGroups(
  dependencies: GraphViewProviderMessageListenerDependencies,
  groupIds: string[],
): Promise<void> {
  const target = dependencies.getConfigTarget(dependencies.workspace.workspaceFolders);

  return Promise.resolve(
    dependencies.workspace.getConfiguration('codegraphy').update(
      'hiddenPluginGroups',
      groupIds,
      target,
    ),
  );
}
