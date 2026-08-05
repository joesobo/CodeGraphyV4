export type EscapeAction =
  | 'handledLocally'
  | 'closeRulePrompt'
  | 'blurEdit'
  | 'closeFilters'
  | 'closePanel'
  | 'clearSelection'
  | 'none';

export interface EscapeState {
  editableTarget: boolean;
  filterOpen: boolean;
  hasSelection: boolean;
  locallyHandled: boolean;
  panelOpen: boolean;
  rulePromptOpen: boolean;
}

export function getEscapeAction(state: EscapeState): EscapeAction {
  if (state.locallyHandled) return 'handledLocally';
  if (state.rulePromptOpen) return 'closeRulePrompt';
  if (state.editableTarget) return 'blurEdit';
  if (state.filterOpen) return 'closeFilters';
  if (state.panelOpen) return 'closePanel';
  if (state.hasSelection) return 'clearSelection';
  return 'none';
}
