import { useEffect, useMemo, useState } from 'react';
import { canAddFilterPattern } from '../model';
import type { FilterDraftState } from './types';

export function useFilterDraftState(pendingPatterns: string[]): FilterDraftState {
  const [draftPattern, setDraftPattern] = useState('');
  const [draftPendingPatterns, setDraftPendingPatterns] = useState<string[]>([]);

  useEffect(() => {
    if (pendingPatterns.length === 0) {
      return;
    }

    setDraftPattern(pendingPatterns[0] ?? '');
    setDraftPendingPatterns(pendingPatterns);
  }, [pendingPatterns]);

  const addablePatterns = useMemo(() => {
    const patterns = draftPendingPatterns.length > 0
      ? draftPendingPatterns
      : [draftPattern];

    return patterns.filter(canAddFilterPattern);
  }, [draftPattern, draftPendingPatterns]);

  return {
    addablePatterns,
    canAdd: addablePatterns.length > 0,
    draftPattern,
    draftPendingPatterns,
    setDraftPattern,
    setDraftPendingPatterns,
    resetDraft: () => {
      setDraftPattern('');
      setDraftPendingPatterns([]);
    },
  };
}
