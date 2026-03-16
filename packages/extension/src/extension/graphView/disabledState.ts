import { resolveGraphViewDisabledState } from './settings/config';

interface InspectLike<T> {
  workspaceValue?: T;
  globalValue?: T;
}

interface LoadGraphViewDisabledStateOptions {
  disabledRulesInspect: InspectLike<string[]> | undefined;
  disabledPluginsInspect: InspectLike<string[]> | undefined;
  persistedDisabledRules: string[] | undefined;
  persistedDisabledPlugins: string[] | undefined;
}

export function loadGraphViewDisabledState(
  disabledRules: Set<string>,
  disabledPlugins: Set<string>,
  {
    disabledRulesInspect,
    disabledPluginsInspect,
    persistedDisabledRules,
    persistedDisabledPlugins,
  }: LoadGraphViewDisabledStateOptions,
) {
  return resolveGraphViewDisabledState(
    disabledRules,
    disabledPlugins,
    disabledRulesInspect?.workspaceValue ?? disabledRulesInspect?.globalValue,
    disabledPluginsInspect?.workspaceValue ?? disabledPluginsInspect?.globalValue,
    persistedDisabledRules,
    persistedDisabledPlugins,
  );
}
