export function normalizeSettingsKeyAlias(key: string): string {
  if (key === 'folderNodeColor') {
    return 'nodeColors.folder';
  }

  if (key === 'groups') {
    return 'legend';
  }

  if (key.startsWith('groups.')) {
    return `legend.${key.slice('groups.'.length)}`;
  }

  if (key === 'exclude') {
    return 'filterPatterns';
  }

  return key;
}

export function getPathSegments(key: string): string[] {
  return normalizeSettingsKeyAlias(key).split('.').filter(Boolean);
}
