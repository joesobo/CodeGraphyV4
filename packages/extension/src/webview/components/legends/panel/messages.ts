import type { IGroup } from '../../../../shared/settings/groups';
import type { LegendIconImport } from '../../../../shared/protocol/webviewToExtension';
import { postMessage } from '../../../vscodeApi';

export function createLegendRuleId(): string {
  return `legend:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

export function reorderItems<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0
    || toIndex < 0
    || fromIndex >= items.length
    || toIndex >= items.length
    || fromIndex === toIndex
  ) {
    return [...items];
  }

  const reordered = [...items];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  return reordered;
}

export function sendUserLegendRules(
  rules: IGroup[],
  setOptimisticUserLegends: (legends: IGroup[]) => void,
  iconImports?: LegendIconImport[],
): void {
  setOptimisticUserLegends(rules);
  postMessage({
    type: 'UPDATE_LEGENDS',
    payload: iconImports?.length ? { legends: rules, iconImports } : { legends: rules },
  });
}
