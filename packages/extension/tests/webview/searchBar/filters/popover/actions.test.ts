import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  commitPatterns,
  handleAddPatterns,
  updateDraftPattern,
} from '../../../../../src/webview/components/searchBar/filters/popover/actions';

const sentMessages: Array<{ type: string; payload?: unknown }> = [];

vi.mock('../../../../../src/webview/vscodeApi', () => ({
  postMessage: (message: { type: string; payload?: unknown }) => sentMessages.push(message),
}));

describe('searchBar/filters/popover/actions', () => {
  beforeEach(() => {
    sentMessages.length = 0;
  });

  it('commits pattern changes to the parent and webview host', () => {
    const onPatternsChange = vi.fn();

    commitPatterns(onPatternsChange, ['src/**']);

    expect(onPatternsChange).toHaveBeenCalledWith(['src/**']);
    expect(sentMessages).toEqual([{
      type: 'UPDATE_FILTER_PATTERNS',
      payload: { patterns: ['src/**'] },
    }]);
  });

  it('resets pending patterns when the draft text changes', () => {
    const setDraftPattern = vi.fn();
    const setDraftPendingPatterns = vi.fn();

    updateDraftPattern(setDraftPattern, setDraftPendingPatterns, 'src/**');

    expect(setDraftPattern).toHaveBeenCalledWith('src/**');
    expect(setDraftPendingPatterns).toHaveBeenCalledWith([]);
  });

  it('adds unique addable patterns and resets the draft', () => {
    const onPatternsChange = vi.fn();
    const resetDraft = vi.fn();

    handleAddPatterns(true, ['existing/**'], ['existing/**', 'src/**'], onPatternsChange, resetDraft);

    expect(onPatternsChange).toHaveBeenCalledWith(['existing/**', 'src/**']);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERNS',
      payload: { patterns: ['existing/**', 'src/**'] },
    });
    expect(resetDraft).toHaveBeenCalledTimes(1);
  });

  it('does not commit disabled or duplicate-only adds', () => {
    const onPatternsChange = vi.fn();
    const resetDraft = vi.fn();

    handleAddPatterns(false, ['existing/**'], ['src/**'], onPatternsChange, resetDraft);
    handleAddPatterns(true, ['existing/**'], ['existing/**'], onPatternsChange, resetDraft);

    expect(onPatternsChange).not.toHaveBeenCalled();
    expect(sentMessages).toEqual([]);
    expect(resetDraft).toHaveBeenCalledTimes(1);
  });
});
