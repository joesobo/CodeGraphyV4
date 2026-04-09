import { resolveGraphViewDisabledState } from './reader';

interface InspectLike<T> {
  workspaceValue?: T;
  globalValue?: T;
}

interface LoadGraphViewDisabledStateOptions {
  disabledPluginsInspect: InspectLike<string[]> | undefined;
}

export function loadGraphViewDisabledState(
  disabledPlugins: Set<string>,
  {
    disabledPluginsInspect,
  }: LoadGraphViewDisabledStateOptions,
) {
  return resolveGraphViewDisabledState(
    disabledPlugins,
    disabledPluginsInspect?.workspaceValue ?? disabledPluginsInspect?.globalValue,
    undefined,
  );
}
