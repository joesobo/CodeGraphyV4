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
  const affectsAny = (...keys: string[]) => keys.some(key => event.affectsConfiguration(key));

  if (event.affectsConfiguration('codegraphy.physics')) {
    return 'physics';
  }

  if (affectsAny('codegraphy.disabledPlugins')) {
    return 'toggles';
  }

  if (affectsAny(
    'codegraphy.showOrphans',
    'codegraphy.directionMode',
    'codegraphy.directionColor',
    'codegraphy.particleSpeed',
    'codegraphy.particleSize',
    'codegraphy.showLabels',
    'codegraphy.bidirectionalEdges',
    'codegraphy.nodeColors',
    'codegraphy.edgeColors',
    'codegraphy.nodeVisibility',
    'codegraphy.edgeVisibility',
  )) {
    return 'display';
  }

  if (affectsAny('codegraphy.legend', 'codegraphy.groups')) {
    return 'groups';
  }

  if (event.affectsConfiguration('codegraphy')) {
    return 'general';
  }

  return null;
}
