export type ConfigCategory =
  | 'physics'
  | 'toggles'
  | 'display'
  | 'legend'
  | 'general';

interface CodeGraphyConfigurationChangeLike {
  changedKeys?: readonly string[];
  affectsConfiguration(section: string): boolean;
}

function isPluginDataOnlyChange(event: CodeGraphyConfigurationChangeLike): boolean {
  const changedKeys = event.changedKeys;
  return changedKeys !== undefined
    && changedKeys.length > 0
    && changedKeys.every(key => key === 'pluginData' || key.startsWith('pluginData.'));
}

/** Determines which category a configuration change falls into. */
export function classifyConfigChange(event: CodeGraphyConfigurationChangeLike): ConfigCategory | null {
  const affectsAny = (...keys: string[]) => keys.some(key => event.affectsConfiguration(key));

  if (isPluginDataOnlyChange(event)) {
    return null;
  }

  if (event.affectsConfiguration('codegraphy.physics')) {
    return 'physics';
  }

  if (affectsAny('codegraphy.plugins')) {
    return 'toggles';
  }

  if (affectsAny(
    'codegraphy.autoReveal',
    'codegraphy.showOrphans',
    'codegraphy.directionMode',
    'codegraphy.directionColor',
    'codegraphy.particleSpeed',
    'codegraphy.particleSize',
    'codegraphy.showLabels',
    'codegraphy.bidirectionalEdges',
    'codegraphy.nodeColors',
    'codegraphy.nodeVisibility',
    'codegraphy.edgeVisibility',
    'codegraphy.cssSnippets',
  )) {
    return 'display';
  }

  if (affectsAny('codegraphy.legend')) {
    return 'legend';
  }

  if (event.affectsConfiguration('codegraphy')) {
    return 'general';
  }

  return null;
}
