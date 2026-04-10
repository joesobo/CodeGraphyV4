import { resolveGraphViewDisabledState } from './reader';

interface InspectLike<T> {
  workspaceValue?: T;
  globalValue?: T;
}

interface LoadGraphViewDisabledStateOptions {
  configuredDisabledPlugins: readonly string[] | undefined;
  disabledPluginsInspect: InspectLike<string[]> | undefined;
}

export function loadGraphViewDisabledState(
  disabledPlugins: Set<string>,
  {
    configuredDisabledPlugins,
    disabledPluginsInspect,
  }: LoadGraphViewDisabledStateOptions,
) {
  return resolveGraphViewDisabledState(
    disabledPlugins,
    configuredDisabledPlugins,
    disabledPluginsInspect?.workspaceValue ?? disabledPluginsInspect?.globalValue,
  );
}
