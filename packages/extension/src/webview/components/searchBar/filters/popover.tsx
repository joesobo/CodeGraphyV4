import React, { useEffect, useMemo, useState } from 'react';
import { mdiClose, mdiFilterVariant } from '@mdi/js';
import { MdiIcon } from '../../icons/MdiIcon';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/overlay/popover';
import { Switch } from '../../ui/switch';
import { cn } from '../../ui/cn';
import type { IPluginFilterPatternGroup } from '../../../../shared/protocol/extensionToWebview';
import {
  addFilterPatterns,
  canAddFilterPattern,
  commitFilterPatternGroupState,
  commitFilterPatterns,
  commitFilterPatternState,
  editFilterPattern,
  filterPatternsEqual,
  getDisabledFilterPatterns,
  getEnabledFilterCount,
  removeFilterPattern,
} from './model';
import { formatExcludedCount } from './countState';

interface FilterPopoverProps {
  disabledCustomPatterns: string[];
  disabledPluginPatterns: string[];
  customPatterns: string[];
  excludedCount: number;
  onDisabledCustomPatternsChange: (patterns: string[]) => void;
  onDisabledPluginPatternsChange: (patterns: string[]) => void;
  onOpenChange?: (open: boolean) => void;
  onPatternsChange: (patterns: string[]) => void;
  open?: boolean;
  pendingPatterns?: string[];
  pluginGroups: IPluginFilterPatternGroup[];
  pluginPatterns: string[];
}

function SectionHeader({
  ariaLabel,
  checked,
  count,
  label,
  onCheckedChange,
  subtext,
}: {
  ariaLabel: string;
  checked: boolean;
  count: number;
  label: string;
  onCheckedChange: (checked: boolean) => void;
  subtext: string;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-0.5">
        <h3 className="text-xs font-medium">
          {label} <span className="text-muted-foreground">{count}</span>
        </h3>
        <p className="text-[11px] text-muted-foreground">{subtext}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={`${checked ? 'Disable' : 'Enable'} all ${ariaLabel}`}
      />
    </div>
  );
}

function PatternList({
  children,
  empty,
}: {
  children?: React.ReactNode;
  empty: boolean;
}): React.ReactElement {
  return (
    <div className="max-h-32 overflow-y-auto rounded-md border border-[var(--vscode-panel-border,#3c3c3c)] bg-[var(--vscode-editor-background,#1f1f1f)] p-2">
      {empty ? (
        <p className="text-xs text-muted-foreground">No filters.</p>
      ) : (
        <ul className="space-y-1">{children}</ul>
      )}
    </div>
  );
}

function PatternRow({
  enabled,
  onDelete,
  onEdit,
  onEnabledChange,
  pattern,
  source,
}: {
  enabled: boolean;
  onDelete?: () => void;
  onEdit?: (value: string) => void;
  onEnabledChange: (enabled: boolean) => void;
  pattern: string;
  source: 'custom' | 'plugin';
}): React.ReactElement {
  const inputId = `filter-pattern-${source}-${pattern}`;

  return (
    <li className={cn('flex items-center gap-2', !enabled && 'opacity-60')}>
      <Switch
        id={inputId}
        checked={enabled}
        onCheckedChange={onEnabledChange}
        aria-label={`${enabled ? 'Disable' : 'Enable'} ${source} filter ${pattern}`}
      />
      <Input
        defaultValue={pattern}
        readOnly={source === 'plugin'}
        aria-label={source === 'plugin' ? `Plugin filter pattern ${pattern}` : `Edit filter pattern ${pattern}`}
        className={cn(
          'h-7 min-w-0 flex-1 border-0 bg-transparent px-0 font-mono text-xs shadow-none focus-visible:ring-0',
          source === 'plugin' && 'cursor-default text-muted-foreground'
        )}
        onBlur={(event) => onEdit?.(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onEdit?.(event.currentTarget.value);
            event.currentTarget.blur();
          }
        }}
      />
      {source === 'custom' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-destructive flex-shrink-0"
          onClick={onDelete}
          title="Delete pattern"
        >
          <MdiIcon path={mdiClose} size={14} />
        </Button>
      )}
    </li>
  );
}

export function FilterPopover({
  disabledCustomPatterns,
  disabledPluginPatterns,
  customPatterns,
  excludedCount,
  onDisabledCustomPatternsChange,
  onDisabledPluginPatternsChange,
  onOpenChange,
  onPatternsChange,
  open,
  pendingPatterns = [],
  pluginGroups,
  pluginPatterns,
}: FilterPopoverProps): React.ReactElement {
  const [draftPattern, setDraftPattern] = useState('');
  const [draftPendingPatterns, setDraftPendingPatterns] = useState<string[]>([]);
  const enabledCount = getEnabledFilterCount({
    customPatterns,
    disabledCustomPatterns,
    disabledPluginPatterns,
    pluginPatterns,
  });
  const disabledCustom = useMemo(() => new Set(disabledCustomPatterns), [disabledCustomPatterns]);
  const disabledPlugin = useMemo(() => new Set(disabledPluginPatterns), [disabledPluginPatterns]);
  const customSectionEnabled = customPatterns.some(pattern => !disabledCustom.has(pattern));
  const pluginSectionEnabled = pluginPatterns.some(pattern => !disabledPlugin.has(pattern));
  const visiblePluginGroups = pluginGroups.length > 0
    ? pluginGroups
    : [{ pluginId: 'plugin-defaults', pluginName: 'Plugin defaults', patterns: pluginPatterns }];

  useEffect(() => {
    if (pendingPatterns.length === 0) {
      return;
    }

    setDraftPattern(pendingPatterns[0] ?? '');
    setDraftPendingPatterns(pendingPatterns);
  }, [pendingPatterns]);

  const addButtonPatterns = useMemo(() => {
    const patterns = draftPendingPatterns.length > 0
      ? draftPendingPatterns
      : [draftPattern];

    return patterns.filter(canAddFilterPattern);
  }, [draftPattern, draftPendingPatterns]);
  const canAdd = addButtonPatterns.length > 0;

  const commitPatterns = (patterns: string[]) => {
    onPatternsChange(patterns);
    commitFilterPatterns(patterns);
  };

  const handleAddPattern = () => {
    if (!canAdd) {
      return;
    }

    const nextPatterns = addFilterPatterns(customPatterns, addButtonPatterns);
    if (!filterPatternsEqual(customPatterns, nextPatterns)) {
      commitPatterns(nextPatterns);
    }
    setDraftPattern('');
    setDraftPendingPatterns([]);
  };

  const handleCustomPatternToggle = (pattern: string, enabled: boolean) => {
    onDisabledCustomPatternsChange(getDisabledFilterPatterns(disabledCustomPatterns, pattern, enabled));
    commitFilterPatternState('custom', pattern, enabled);
  };

  const handlePluginPatternToggle = (pattern: string, enabled: boolean) => {
    onDisabledPluginPatternsChange(getDisabledFilterPatterns(disabledPluginPatterns, pattern, enabled));
    commitFilterPatternState('plugin', pattern, enabled);
  };

  const handleCustomSectionToggle = (enabled: boolean) => {
    onDisabledCustomPatternsChange(enabled ? [] : customPatterns);
    commitFilterPatternGroupState('custom', enabled);
  };

  const handlePluginSectionToggle = (enabled: boolean) => {
    onDisabledPluginPatternsChange(enabled ? [] : pluginPatterns);
    commitFilterPatternGroupState('plugin', enabled);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant={enabledCount > 0 ? 'secondary' : 'outline'}
          size="sm"
          className="h-7 px-2 text-xs"
          title={formatExcludedCount(excludedCount)}
        >
          <MdiIcon path={mdiFilterVariant} size={14} />
          Filters {enabledCount}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="border-b px-3 py-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Filters</h2>
            <span className="text-xs text-muted-foreground">{enabledCount} enabled</span>
          </div>
          <p className="text-[11px] text-muted-foreground">{formatExcludedCount(excludedCount)}</p>
        </div>

        <div className="space-y-3 p-3">
          <div className="space-y-1.5">
            <SectionHeader
              ariaLabel="custom filters"
              checked={customSectionEnabled}
              count={customPatterns.length}
              label="Custom"
              onCheckedChange={handleCustomSectionToggle}
              subtext="Globs you add for this repo"
            />
            <p className="text-xs text-muted-foreground">Add glob</p>
            <div className="flex items-center gap-1.5">
              <Input
                id="new-filter-pattern"
                value={draftPattern}
                onChange={(event) => {
                  setDraftPattern(event.target.value);
                  setDraftPendingPatterns([]);
                }}
                onKeyDown={(event) => event.key === 'Enter' && handleAddPattern()}
                placeholder="**/src/app.ts"
                className="h-7 flex-1 text-xs"
              />
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleAddPattern}
                disabled={!canAdd}
              >
                Add
              </Button>
            </div>
            {draftPendingPatterns.length > 1 && (
              <p className="text-[11px] text-muted-foreground">
                Adds {draftPendingPatterns.length} selected globs.
              </p>
            )}
            <PatternList empty={customPatterns.length === 0}>
              {customPatterns.map((pattern) => (
                <PatternRow
                  key={pattern}
                  enabled={!disabledCustom.has(pattern)}
                  pattern={pattern}
                  source="custom"
                  onDelete={() => commitPatterns(removeFilterPattern(customPatterns, pattern))}
                  onEdit={(nextPattern) =>
                    commitPatterns(editFilterPattern(customPatterns, pattern, nextPattern))}
                  onEnabledChange={(enabled) => handleCustomPatternToggle(pattern, enabled)}
                />
              ))}
            </PatternList>
          </div>

          <div className="space-y-1.5">
            <SectionHeader
              ariaLabel="plugin filters"
              checked={pluginSectionEnabled}
              count={pluginPatterns.length}
              label="Plugin defaults"
              onCheckedChange={handlePluginSectionToggle}
              subtext="Read-only globs from enabled plugins"
            />
            <PatternList empty={pluginPatterns.length === 0}>
              {visiblePluginGroups.map((group) => (
                <li key={group.pluginId} className="space-y-1">
                  <p className="px-1 text-[11px] font-medium text-muted-foreground">
                    {group.pluginName}
                  </p>
                  <ul className="space-y-1">
                    {group.patterns.map((pattern) => (
                      <PatternRow
                        key={`${group.pluginId}:${pattern}`}
                        enabled={!disabledPlugin.has(pattern)}
                        pattern={pattern}
                        source="plugin"
                        onEnabledChange={(enabled) => handlePluginPatternToggle(pattern, enabled)}
                      />
                    ))}
                  </ul>
                </li>
              ))}
            </PatternList>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
