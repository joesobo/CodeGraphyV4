import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useFilterDraftState } from '../../../../../src/webview/components/searchBar/filters/popover/draftState';

interface DraftStateProps {
  pendingPatterns: string[];
}

describe('searchBar/filters/popover/draftState', () => {
  it('uses pending patterns before the draft text', () => {
    const { result, rerender } = renderHook(
      ({ pendingPatterns }: DraftStateProps) => useFilterDraftState(pendingPatterns),
      { initialProps: { pendingPatterns: [] as string[] } },
    );

    act(() => result.current.setDraftPattern('manual/**'));
    expect(result.current.addablePatterns).toEqual(['manual/**']);

    rerender({ pendingPatterns: ['pending-a/**', 'pending-b/**'] });

    expect(result.current.draftPattern).toBe('pending-a/**');
    expect(result.current.draftPendingPatterns).toEqual(['pending-a/**', 'pending-b/**']);
    expect(result.current.addablePatterns).toEqual(['pending-a/**', 'pending-b/**']);
  });

  it('filters blank patterns and clears the draft state', () => {
    const { result } = renderHook(() => useFilterDraftState([]));

    act(() => result.current.setDraftPattern('   '));
    expect(result.current.canAdd).toBe(false);

    act(() => {
      result.current.setDraftPattern('src/**');
      result.current.setDraftPendingPatterns(['src/**']);
    });
    expect(result.current.canAdd).toBe(true);

    act(() => result.current.resetDraft());

    expect(result.current.draftPattern).toBe('');
    expect(result.current.draftPendingPatterns).toEqual([]);
    expect(result.current.canAdd).toBe(false);
  });
});
