import type { IGroup } from '../../../../shared/contracts';

function getBuiltInGraphViewDefaultGroupDefinitions(): Array<{ pattern: string; color: string }> {
  return [
    { pattern: '.gitignore', color: '#F97583' },
    { pattern: '*.json', color: '#F9C74F' },
    { pattern: '*.png', color: '#90BE6D' },
    { pattern: '*.jpg', color: '#90BE6D' },
    { pattern: '*.svg', color: '#43AA8B' },
    { pattern: '*.md', color: '#577590' },
    { pattern: '*.jpeg', color: '#90BE6D' },
    { pattern: '.vscode/settings.json', color: '#277ACC' },
  ];
}

export function getBuiltInGraphViewDefaultGroups(): IGroup[] {
  return getBuiltInGraphViewDefaultGroupDefinitions().map(({ pattern, color }) => ({
    id: `default:${pattern}`,
    pattern,
    color,
    isPluginDefault: true,
    pluginName: 'CodeGraphy',
  }));
}
