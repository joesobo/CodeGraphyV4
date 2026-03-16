import React, { useState } from 'react';
import { postMessage } from '../../../lib/vscodeApi';
import { useGraphStore } from '../../../store';
import { MaxFilesControl } from './MaxFilesControl';
import {
  canAddFilterPattern,
  clampMaxFiles,
  decreaseMaxFiles,
  increaseMaxFiles,
  parseMaxFilesInput,
} from './model';
import { OrphansToggle } from './OrphansToggle';
import { Patterns } from './Patterns';

export function FilterSection(): React.ReactElement {
  const filterPatterns = useGraphStore((state) => state.filterPatterns);
  const setFilterPatterns = useGraphStore((state) => state.setFilterPatterns);
  const pluginFilterPatterns = useGraphStore((state) => state.pluginFilterPatterns);
  const showOrphans = useGraphStore((state) => state.showOrphans);
  const setShowOrphans = useGraphStore((state) => state.setShowOrphans);
  const maxFiles = useGraphStore((state) => state.maxFiles);
  const setMaxFiles = useGraphStore((state) => state.setMaxFiles);
  const [newFilterPattern, setNewFilterPattern] = useState('');

  const updateFilterPatterns = (patterns: string[]) => {
    setFilterPatterns(patterns);
    postMessage({ type: 'UPDATE_FILTER_PATTERNS', payload: { patterns } });
  };

  const handleShowOrphansToggle = (checked: boolean) => {
    setShowOrphans(checked);
    postMessage({ type: 'UPDATE_SHOW_ORPHANS', payload: { showOrphans: checked } });
  };

  const handleAddFilterPattern = () => {
    if (!canAddFilterPattern(newFilterPattern)) {
      return;
    }

    const normalizedPattern = newFilterPattern.trim();
    updateFilterPatterns([...filterPatterns, normalizedPattern]);
    setNewFilterPattern('');
  };

  const handleDeleteFilterPattern = (pattern: string) => {
    updateFilterPatterns(filterPatterns.filter((entry) => entry !== pattern));
  };

  const handleMaxFilesCommit = (value: number) => {
    const clamped = clampMaxFiles(value);
    setMaxFiles(clamped);
    postMessage({ type: 'UPDATE_MAX_FILES', payload: { maxFiles: clamped } });
  };

  const handleMaxFilesChange = (value: string) => {
    const parsed = parseMaxFilesInput(value);
    if (parsed !== null) {
      setMaxFiles(parsed);
    }
  };

  const handleMaxFilesBlur = (value: string) => {
    handleMaxFilesCommit(parseMaxFilesInput(value) ?? 1);
  };

  const handleMaxFilesKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleMaxFilesCommit(parseMaxFilesInput(event.currentTarget.value) ?? 1);
    }
  };

  return (
    <div className="mb-2 space-y-2">
      <OrphansToggle
        onCheckedChange={handleShowOrphansToggle}
        showOrphans={showOrphans}
      />

      <MaxFilesControl
        maxFiles={maxFiles}
        onBlur={handleMaxFilesBlur}
        onChange={handleMaxFilesChange}
        onDecrease={() => handleMaxFilesCommit(decreaseMaxFiles(maxFiles))}
        onIncrease={() => handleMaxFilesCommit(increaseMaxFiles(maxFiles))}
        onKeyDown={handleMaxFilesKeyDown}
      />

      <Patterns
        filterPatterns={filterPatterns}
        newFilterPattern={newFilterPattern}
        onAdd={handleAddFilterPattern}
        onDelete={handleDeleteFilterPattern}
        onPatternChange={setNewFilterPattern}
        pluginFilterPatterns={pluginFilterPatterns}
      />
    </div>
  );
}
