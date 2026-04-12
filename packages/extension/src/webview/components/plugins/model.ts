import type { IPluginStatus } from '../../../shared/plugins/status';

export function getPluginsPanelWrapperClassName(enabled: boolean): string {
  return enabled ? '' : 'opacity-50';
}

export function getPluginsPanelItemClassName(
  enabled: boolean,
  index: number,
  dragIndex: number | null,
  dragOverIndex: number | null,
): string {
  const classes = [getPluginsPanelWrapperClassName(enabled)];

  if (dragIndex === index) {
    classes.push('opacity-60');
  }

  if (dragOverIndex === index && dragIndex !== index) {
    classes.push('rounded-md ring-1 ring-primary/40');
  }

  return classes.filter(Boolean).join(' ');
}

export function reorderPluginStatuses(
  plugins: IPluginStatus[],
  sourceIndex: number,
  targetIndex: number,
): IPluginStatus[] {
  if (
    sourceIndex < 0
    || targetIndex < 0
    || sourceIndex >= plugins.length
    || targetIndex >= plugins.length
    || sourceIndex === targetIndex
  ) {
    return plugins;
  }

  const reordered = [...plugins];
  const [movedPlugin] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, movedPlugin);
  return reordered;
}
