import React from 'react';
import { mdiChevronDown, mdiChevronRight } from '@mdi/js';
import type { IPluginFilterPatternGroup } from '../../../../../shared/protocol/extensionToWebview';
import { MdiIcon } from '../../../icons/MdiIcon';
import { Button } from '../../../ui/button';
import { Switch } from '../../../ui/switch';
import { PatternRow } from './patternRow';
import { isSectionEnabled } from './sectionState';

interface PluginFilterGroupProps {
  disabledPlugin: ReadonlySet<string>;
  expanded: boolean;
  group: IPluginFilterPatternGroup;
  onExpandedChange: () => void;
  onPluginGroupToggle: (group: IPluginFilterPatternGroup, enabled: boolean) => void;
  onPluginPatternToggle: (pattern: string, enabled: boolean) => void;
}

export function PluginFilterGroup({
  disabledPlugin,
  expanded,
  group,
  onExpandedChange,
  onPluginGroupToggle,
  onPluginPatternToggle,
}: PluginFilterGroupProps): React.ReactElement {
  const enabled = isSectionEnabled(group.patterns, disabledPlugin);
  const contentId = `plugin-filter-group-${group.pluginId}`;

  return (
    <li className="rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-surface-subtle)]">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          aria-expanded={expanded}
          aria-controls={contentId}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${group.pluginName} plugin filters`}
          onClick={onExpandedChange}
        >
          <MdiIcon path={expanded ? mdiChevronDown : mdiChevronRight} size={14} />
        </Button>
        <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-muted-foreground">
          {group.pluginName} <span>{group.patterns.length}</span>
        </p>
        <Switch
          checked={enabled}
          onCheckedChange={(isEnabled) => onPluginGroupToggle(group, isEnabled)}
          aria-label={`${enabled ? 'Disable' : 'Enable'} plugin ${group.pluginName} filters`}
        />
      </div>
      {expanded ? (
        <ul id={contentId} className="space-y-1 border-t border-[var(--cg-border-subtle)] p-2">
          {group.patterns.map((pattern) => (
            <PatternRow
              key={`${group.pluginId}:${pattern}`}
              enabled={!disabledPlugin.has(pattern)}
              pattern={pattern}
              source="plugin"
              onEnabledChange={(isEnabled) => onPluginPatternToggle(pattern, isEnabled)}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
