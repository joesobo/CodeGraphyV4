import type { RulePromptState } from './view';

export const DEFAULT_LEGEND_RULE_COLOR = '#808080';

export function getRulePromptColor(state: RulePromptState | null): string {
  return state?.kind === 'legend' ? state.color : DEFAULT_LEGEND_RULE_COLOR;
}

export function getRulePromptTitle(state: RulePromptState | null): string {
  if (!state) {
    return '';
  }

  return state.kind === 'filter' ? 'Add Filter' : 'Add Legend Group';
}

export function createSubmittedRulePromptState(
  state: RulePromptState,
  pattern: string,
  color: string,
): RulePromptState {
  if (state.kind === 'filter') {
    return { kind: 'filter', pattern };
  }

  return { kind: 'legend', pattern, color, target: state.target };
}
