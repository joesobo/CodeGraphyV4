import React, { useState } from 'react';
import { mdiClose, mdiLockOutline, mdiMinus, mdiPlus } from '@mdi/js';
import { postMessage } from '../../../lib/vscodeApi';
import { useGraphStore } from '../../../store';
import { MdiIcon } from '../../icons';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import {
  canAddFilterPattern,
  clampMaxFiles,
  decreaseMaxFiles,
  increaseMaxFiles,
  parseMaxFilesInput,
  shouldShowPluginFilterPatterns,
} from './model';

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

  const addButtonDisabled = !canAddFilterPattern(newFilterPattern);

  return (
    <div className="mb-2 space-y-2">
      <div className="flex items-center justify-between py-0.5">
        <Label htmlFor="show-orphans" className="text-xs">
          Show Orphans
        </Label>
        <Switch
          id="show-orphans"
          checked={showOrphans}
          onCheckedChange={handleShowOrphansToggle}
        />
      </div>

      <div className="flex items-center justify-between py-0.5">
        <Label className="text-xs">Max Files</Label>
        <div className="flex items-center gap-0.5">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleMaxFilesCommit(decreaseMaxFiles(maxFiles))}
            disabled={maxFiles <= 1}
            title="Decrease by 100"
          >
            <MdiIcon path={mdiMinus} size={12} />
          </Button>
          <Input
            type="text"
            inputMode="numeric"
            value={maxFiles}
            onChange={(event) => handleMaxFilesChange(event.target.value)}
            onBlur={(event) => handleMaxFilesBlur(event.target.value)}
            onKeyDown={handleMaxFilesKeyDown}
            className="h-6 w-14 text-xs text-center px-1"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleMaxFilesCommit(increaseMaxFiles(maxFiles))}
            title="Increase by 100"
          >
            <MdiIcon path={mdiPlus} size={12} />
          </Button>
        </div>
      </div>

      {shouldShowPluginFilterPatterns(pluginFilterPatterns) && (
        <>
          <p className="text-xs text-muted-foreground">Plugin defaults (read-only)</p>
          <ul className="space-y-1">
            {pluginFilterPatterns.map((pattern) => (
              <li key={pattern} className="flex items-center gap-2 opacity-60">
                <MdiIcon
                  path={mdiLockOutline}
                  size={12}
                  className="text-muted-foreground flex-shrink-0"
                />
                <span className="text-xs text-muted-foreground flex-1 truncate font-mono">
                  {pattern}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="text-xs text-muted-foreground">Custom (exclude from graph)</p>
      {filterPatterns.length === 0 ? (
        <p className="text-xs text-muted-foreground">No patterns.</p>
      ) : (
        <ul className="space-y-1">
          {filterPatterns.map((pattern) => (
            <li key={pattern} className="flex items-center gap-2">
              <span className="text-xs flex-1 truncate font-mono">{pattern}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-destructive flex-shrink-0"
                onClick={() => handleDeleteFilterPattern(pattern)}
                title="Delete pattern"
              >
                <MdiIcon path={mdiClose} size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-1.5 pt-1">
        <Input
          value={newFilterPattern}
          onChange={(event) => setNewFilterPattern(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleAddFilterPattern()}
          placeholder="*.png"
          className="flex-1 h-7 text-xs min-w-0"
        />
        <Button
          variant="secondary"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleAddFilterPattern}
          disabled={addButtonDisabled}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
