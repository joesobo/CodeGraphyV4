import type { RulePromptState } from './view';
import type { IGroup } from '../../../shared/settings/groups';

export function buildNextFilterPatterns(
  filterPatterns: string[],
  pattern: string,
): string[] | null {
  const normalizedPattern = pattern.trim();

  if (!normalizedPattern || filterPatterns.includes(normalizedPattern)) {
    return null;
  }

  return [...filterPatterns, normalizedPattern];
}

export function buildNextLegendRules(
  userLegendRules: IGroup[],
  nextState: Extract<RulePromptState, { kind: 'legend' }>,
  createId: () => string,
): IGroup[] | null {
  const normalizedPattern = nextState.pattern.trim();

  if (!normalizedPattern) {
    return null;
  }

  return [
    ...userLegendRules,
    {
      id: createId(),
      pattern: normalizedPattern,
      color: nextState.color,
      target: nextState.target,
    },
  ];
}
