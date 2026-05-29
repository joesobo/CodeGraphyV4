import type { IGroup } from '../../../../../../shared/settings/groups';

export function canEditRuleVisual(editable: boolean, rule: IGroup): boolean {
  return editable && rule.target !== 'edge';
}
