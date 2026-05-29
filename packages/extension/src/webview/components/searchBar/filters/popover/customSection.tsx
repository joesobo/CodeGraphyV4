import React from 'react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import {
  editFilterPattern,
  removeFilterPattern,
} from '../model';
import {
  commitPatterns,
  updateDraftPattern,
} from './actions';
import { PatternList } from './patternList';
import { PatternRow } from './patternRow';
import { SectionHeader } from './sectionHeader';

interface CustomFiltersSectionProps {
  canAdd: boolean;
  customPatterns: string[];
  disabledCustom: ReadonlySet<string>;
  draftPattern: string;
  draftPendingPatterns: string[];
  enabled: boolean;
  onAddPattern: () => void;
  onCustomPatternToggle: (pattern: string, enabled: boolean) => void;
  onPatternsChange: (patterns: string[]) => void;
  onSectionToggle: (enabled: boolean) => void;
  setDraftPattern: React.Dispatch<React.SetStateAction<string>>;
  setDraftPendingPatterns: React.Dispatch<React.SetStateAction<string[]>>;
}

export function CustomFiltersSection({
  canAdd,
  customPatterns,
  draftPattern,
  draftPendingPatterns,
  enabled,
  onAddPattern,
  onCustomPatternToggle,
  onPatternsChange,
  onSectionToggle,
  setDraftPattern,
  setDraftPendingPatterns,
  disabledCustom,
}: CustomFiltersSectionProps): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <SectionHeader
        ariaLabel="custom filters"
        checked={enabled}
        count={customPatterns.length}
        label="Custom"
        onCheckedChange={onSectionToggle}
        subtext="Globs you add for this repo"
      />
      <p className="text-xs text-muted-foreground">Add glob</p>
      <div className="flex items-center gap-1.5">
        <Input
          id="new-filter-pattern"
          value={draftPattern}
          onChange={(event) => updateDraftPattern(setDraftPattern, setDraftPendingPatterns, event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && onAddPattern()}
          placeholder="**/src/app.ts"
          className="h-7 flex-1 text-xs"
        />
        <Button
          variant="secondary"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onAddPattern}
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
            onDelete={() => commitPatterns(onPatternsChange, removeFilterPattern(customPatterns, pattern))}
            onEdit={(nextPattern) =>
              commitPatterns(onPatternsChange, editFilterPattern(customPatterns, pattern, nextPattern))}
            onEnabledChange={(isEnabled) => onCustomPatternToggle(pattern, isEnabled)}
          />
        ))}
      </PatternList>
    </div>
  );
}
