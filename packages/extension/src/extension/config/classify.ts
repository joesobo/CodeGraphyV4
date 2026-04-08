export type ConfigCategory =
  | 'physics'
  | 'toggles'
  | 'display'
  | 'groups'
  | 'general';

interface CodeGraphyConfigurationChangeLike {
  affectsConfiguration(section: string): boolean;
}

/** Determines which category a configuration change falls into. */
export function classifyConfigChange(event: CodeGraphyConfigurationChangeLike): ConfigCategory | null {
  if (event.affectsConfiguration('codegraphy.physics')) {
    return 'physics';
  }

  if (
    event.affectsConfiguration('codegraphy.disabledSources') ||
    event.affectsConfiguration('codegraphy.disabledPlugins')
  ) {
    return 'toggles';
  }

  if (
    event.affectsConfiguration('codegraphy.directionMode') ||
    event.affectsConfiguration('codegraphy.directionColor') ||
    event.affectsConfiguration('codegraphy.particleSpeed') ||
    event.affectsConfiguration('codegraphy.particleSize') ||
    event.affectsConfiguration('codegraphy.showLabels') ||
    event.affectsConfiguration('codegraphy.bidirectionalEdges')
  ) {
    return 'display';
  }

  if (
    event.affectsConfiguration('codegraphy.groups') ||
    event.affectsConfiguration('codegraphy.hiddenPluginGroups')
  ) {
    return 'groups';
  }

  if (event.affectsConfiguration('codegraphy')) {
    return 'general';
  }

  return null;
}
