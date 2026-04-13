import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { postMessage } from '../../../vscodeApi';
import { useGraphStore } from '../../../store/state';
import {
  clampMaxFiles,
  decreaseMaxFiles,
  increaseMaxFiles,
  parseMaxFilesInput,
} from './model';
import { addFilterPattern, deleteFilterPattern, editFilterPattern } from './patternActions';

export type FilterController = {
  filterPatterns: string[];
  maxFiles: number;
  newFilterPattern: string;
  onAddPattern: () => void;
  onDecreaseMaxFiles: () => void;
  onDeletePattern: (pattern: string) => void;
  onEditPattern: (previousPattern: string, nextPattern: string) => void;
  onIncreaseMaxFiles: () => void;
  onMaxFilesBlur: (value: string) => void;
  onMaxFilesChange: (value: string) => void;
  onMaxFilesKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onPatternChange: (pattern: string) => void;
  onShowOrphansChange: (checked: boolean) => void;
  pluginFilterPatterns: string[];
  showOrphans: boolean;
};

export function useFilterController(): FilterController {
  const filterPatterns = useGraphStore((state) => state.filterPatterns);
  const maxFiles = useGraphStore((state) => state.maxFiles);
  const pluginFilterPatterns = useGraphStore((state) => state.pluginFilterPatterns);
  const setFilterPatterns = useGraphStore((state) => state.setFilterPatterns);
  const setMaxFiles = useGraphStore((state) => state.setMaxFiles);
  const setShowOrphans = useGraphStore((state) => state.setShowOrphans);
  const showOrphans = useGraphStore((state) => state.showOrphans);
  const [newFilterPattern, setNewFilterPattern] = useState('');

  const commitMaxFiles = (value: number) => {
    const clamped = clampMaxFiles(value);
    setMaxFiles(clamped);
    postMessage({ type: 'UPDATE_MAX_FILES', payload: { maxFiles: clamped } });
  };

  return {
    filterPatterns,
    maxFiles,
    newFilterPattern,
    onAddPattern: () => {
      addFilterPattern(filterPatterns, newFilterPattern, setFilterPatterns, setNewFilterPattern);
    },
    onDecreaseMaxFiles: () => commitMaxFiles(decreaseMaxFiles(maxFiles)),
    onDeletePattern: (pattern: string) => {
      deleteFilterPattern(filterPatterns, pattern, setFilterPatterns);
    },
    onEditPattern: (previousPattern: string, nextPattern: string) => {
      editFilterPattern(filterPatterns, previousPattern, nextPattern, setFilterPatterns);
    },
    onIncreaseMaxFiles: () => commitMaxFiles(increaseMaxFiles(maxFiles)),
    onMaxFilesBlur: (value: string) => {
      commitMaxFiles(parseMaxFilesInput(value) ?? 1);
    },
    onMaxFilesChange: (value: string) => {
      const parsed = parseMaxFilesInput(value);
      if (parsed !== null) {
        setMaxFiles(parsed);
      }
    },
    onMaxFilesKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        commitMaxFiles(parseMaxFilesInput(event.currentTarget.value) ?? 1);
      }
    },
    onPatternChange: setNewFilterPattern,
    onShowOrphansChange: (checked: boolean) => {
      setShowOrphans(checked);
      postMessage({ type: 'UPDATE_SHOW_ORPHANS', payload: { showOrphans: checked } });
    },
    pluginFilterPatterns,
    showOrphans,
  };
}
