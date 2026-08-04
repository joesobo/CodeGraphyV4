import { describe, expect, it } from 'vitest';
import { getEscapeAction } from '../../../../../src/webview/app/shell/escape/model';

describe('app/shell Escape decision model', () => {
  it.each([
    [{ locallyHandled: true }, 'handledLocally'],
    [{ rulePromptOpen: true, editableTarget: true, filterOpen: true, panelOpen: true, hasSelection: true }, 'closeRulePrompt'],
    [{ editableTarget: true, filterOpen: true, panelOpen: true, hasSelection: true }, 'blurEdit'],
    [{ filterOpen: true, panelOpen: true, hasSelection: true }, 'closeFilters'],
    [{ panelOpen: true, hasSelection: true }, 'closePanel'],
    [{ hasSelection: true }, 'clearSelection'],
    [{}, 'none'],
  ] as const)('chooses one highest-priority action for %o', (state, expected) => {
    expect(getEscapeAction({
      locallyHandled: false,
      rulePromptOpen: false,
      editableTarget: false,
      filterOpen: false,
      panelOpen: false,
      hasSelection: false,
      ...state,
    })).toBe(expected);
  });
});
