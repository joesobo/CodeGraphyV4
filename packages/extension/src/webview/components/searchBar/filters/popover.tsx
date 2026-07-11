import React, { useState } from 'react';
import { mdiFilterVariant } from '@mdi/js';
import type { IPluginFilterPatternGroup } from '../../../../shared/protocol/extensionToWebview';
import { MdiIcon } from '../../icons/MdiIcon';
import { Button } from '../../ui/button';
import {
  commitFilterPatternGroupState,
  commitFilterPatternState,
  commitRespectFilesExclude,
  getDisabledFilterPatternGroup,
  getDisabledFilterPatterns,
  getEnabledFilterCount,
} from './model';
import { formatExcludedCount } from './countState';
import { handleAddPatterns } from './popover/actions';
import { CustomFiltersSection } from './popover/customSection';
import { useFilterDraftState } from './popover/draftState';
import { PluginFiltersSection } from './popover/pluginSection';
import { useFilterSectionState } from './popover/sectionState';
import { SectionHeader } from './popover/sectionHeader';
import type { FilterPopoverProps } from './popover/types';

export function FilterPopover({
  disabledCustomPatterns,
  disabledPluginPatterns,
  customPatterns,
  excludedCount,
  onDisabledCustomPatternsChange,
  onDisabledPluginPatternsChange,
  onOpenChange,
  onPatternsChange,
  onRespectFilesExcludeChange,
  open,
  pendingPatterns = [],
  pluginGroups,
  pluginPatterns,
  respectFilesExclude,
}: FilterPopoverProps): React.ReactElement {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = (nextOpen: boolean): void => {
    setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };
  const {
    addablePatterns,
    canAdd,
    draftPattern,
    draftPendingPatterns,
    resetDraft,
    setDraftPattern,
    setDraftPendingPatterns,
  } = useFilterDraftState(pendingPatterns);
  const enabledCount = getEnabledFilterCount({
    customPatterns,
    disabledCustomPatterns,
    disabledPluginPatterns,
    pluginPatterns,
    respectFilesExclude,
  });
  const {
    customSectionEnabled,
    disabledCustom,
    disabledPlugin,
    pluginSectionEnabled,
    visiblePluginGroups,
  } = useFilterSectionState(
    customPatterns,
    disabledCustomPatterns,
    disabledPluginPatterns,
    pluginGroups,
    pluginPatterns,
  );

  const handleAddPattern = (): void => {
    handleAddPatterns(canAdd, customPatterns, addablePatterns, onPatternsChange, resetDraft);
  };

  const handleCustomPatternToggle = (pattern: string, enabled: boolean) => {
    onDisabledCustomPatternsChange(getDisabledFilterPatterns(disabledCustomPatterns, pattern, enabled));
    commitFilterPatternState('custom', pattern, enabled);
  };

  const handlePluginPatternToggle = (pattern: string, enabled: boolean) => {
    onDisabledPluginPatternsChange(getDisabledFilterPatterns(disabledPluginPatterns, pattern, enabled));
    commitFilterPatternState('plugin', pattern, enabled);
  };

  const handlePluginGroupToggle = (group: IPluginFilterPatternGroup, enabled: boolean) => {
    onDisabledPluginPatternsChange(getDisabledFilterPatternGroup(disabledPluginPatterns, group.patterns, enabled));
    group.patterns.forEach((pattern) => commitFilterPatternState('plugin', pattern, enabled));
  };

  const handleCustomSectionToggle = (enabled: boolean) => {
    onDisabledCustomPatternsChange(enabled ? [] : customPatterns);
    commitFilterPatternGroupState('custom', enabled);
  };

  const handlePluginSectionToggle = (enabled: boolean) => {
    onDisabledPluginPatternsChange(enabled ? [] : pluginPatterns);
    commitFilterPatternGroupState('plugin', enabled);
  };

  const handleFilesExcludeToggle = (enabled: boolean) => {
    onRespectFilesExcludeChange(enabled);
    commitRespectFilesExclude(enabled);
  };

  return (
    <>
      <Button
        variant={enabledCount > 0 ? 'secondary' : 'outline'}
        size="sm"
        className="h-7 px-2 text-xs"
        aria-expanded={isOpen}
        aria-label={`Filters, ${enabledCount} enabled`}
        title={formatExcludedCount(excludedCount)}
        onClick={() => setOpen(!isOpen)}
      >
        <MdiIcon path={mdiFilterVariant} size={14} />
        {enabledCount}
      </Button>
      {isOpen ? (
        <div
          className="basis-full overflow-hidden rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-surface-subtle)]"
          data-codegraphy-panel="filters"
          data-testid="filters-inline-surface"
        >
          <header className="border-b px-3 py-2" data-codegraphy-region="panel-header">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Filters</h2>
              <span className="text-xs text-muted-foreground">{enabledCount} enabled</span>
            </div>
            <p className="text-[11px] text-muted-foreground">{formatExcludedCount(excludedCount)}</p>
          </header>

          <div className="max-h-[min(320px,35vh)] space-y-3 overflow-y-auto p-3" data-codegraphy-region="panel-body">
            <SectionHeader
              ariaLabel="VS Code files.exclude"
              checked={respectFilesExclude}
              count={respectFilesExclude ? excludedCount : 0}
              label="VS Code files.exclude"
              includeAllInAriaLabel={false}
              onCheckedChange={handleFilesExcludeToggle}
              subtext="Workspace-native file exclusions"
            />

            <CustomFiltersSection
              canAdd={canAdd}
              customPatterns={customPatterns}
              disabledCustom={disabledCustom}
              draftPattern={draftPattern}
              draftPendingPatterns={draftPendingPatterns}
              enabled={customSectionEnabled}
              onAddPattern={handleAddPattern}
              onCustomPatternToggle={handleCustomPatternToggle}
              onPatternsChange={onPatternsChange}
              onSectionToggle={handleCustomSectionToggle}
              setDraftPattern={setDraftPattern}
              setDraftPendingPatterns={setDraftPendingPatterns}
            />

            <PluginFiltersSection
              disabledPlugin={disabledPlugin}
              enabled={pluginSectionEnabled}
              onPluginGroupToggle={handlePluginGroupToggle}
              onPluginPatternToggle={handlePluginPatternToggle}
              onSectionToggle={handlePluginSectionToggle}
              pluginPatterns={pluginPatterns}
              visiblePluginGroups={visiblePluginGroups}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
