import { resolveGraphViewDisabledState } from './reader';

interface InspectLike<T> {
  workspaceValue?: T;
  globalValue?: T;
}

interface LoadGraphViewDisabledStateOptions {
  disabledSourcesInspect: InspectLike<string[]> | undefined;
  disabledPluginsInspect: InspectLike<string[]> | undefined;
}

export function loadGraphViewDisabledState(
  disabledSources: Set<string>,
  disabledPlugins: Set<string>,
  {
    disabledSourcesInspect,
    disabledPluginsInspect,
  }: LoadGraphViewDisabledStateOptions,
) {
  return resolveGraphViewDisabledState(
    disabledSources,
    disabledPlugins,
    disabledSourcesInspect?.workspaceValue ?? disabledSourcesInspect?.globalValue,
    disabledPluginsInspect?.workspaceValue ?? disabledPluginsInspect?.globalValue,
    undefined,
    undefined,
  );
}
