import { useState } from 'react';
import { toFilterGlob } from '../../components/searchBar/filters/model';

export function buildPendingFilterPatterns(patterns: string[]): string[] {
  return patterns.map(toFilterGlob).filter(Boolean);
}

export function useFilterPopoverState() {
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [pendingFilterPatterns, setPendingFilterPatterns] = useState<string[]>([]);

  const handleFilterPopoverOpenChange = (open: boolean) => {
    setFilterPopoverOpen(open);
    if (!open) {
      setPendingFilterPatterns([]);
    }
  };

  const openFilterPopoverWithPatterns = (patterns: string[]) => {
    setPendingFilterPatterns(buildPendingFilterPatterns(patterns));
    setFilterPopoverOpen(true);
  };

  return {
    filterPopoverOpen,
    handleFilterPopoverOpenChange,
    openFilterPopoverWithPatterns,
    pendingFilterPatterns,
  };
}
