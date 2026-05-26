import React, { useState } from 'react';
import type { IPluginFilterPatternGroup } from '../../../../../shared/protocol/extensionToWebview';
import { PatternList } from './patternList';
import { PluginFilterGroup } from './pluginGroup';
import { SectionHeader } from './sectionHeader';

interface PluginFiltersSectionProps {
  disabledPlugin: ReadonlySet<string>;
  enabled: boolean;
  onPluginGroupToggle: (group: IPluginFilterPatternGroup, enabled: boolean) => void;
  onPluginPatternToggle: (pattern: string, enabled: boolean) => void;
  onSectionToggle: (enabled: boolean) => void;
  pluginPatterns: string[];
  visiblePluginGroups: IPluginFilterPatternGroup[];
}

export function PluginFiltersSection({
  disabledPlugin,
  enabled,
  onPluginGroupToggle,
  onPluginPatternToggle,
  onSectionToggle,
  pluginPatterns,
  visiblePluginGroups,
}: PluginFiltersSectionProps): React.ReactElement {
  const [expandedPluginIds, setExpandedPluginIds] = useState<Set<string>>(() => new Set());
  const togglePluginGroupExpanded = (pluginId: string): void => {
    setExpandedPluginIds((current) => {
      const next = new Set(current);
      if (next.has(pluginId)) {
        next.delete(pluginId);
      } else {
        next.add(pluginId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-1.5">
      <SectionHeader
        ariaLabel="plugin filters"
        checked={enabled}
        count={pluginPatterns.length}
        label="Plugin defaults"
        onCheckedChange={onSectionToggle}
        subtext="Read-only globs from enabled plugins"
      />
      <PatternList empty={pluginPatterns.length === 0}>
        {visiblePluginGroups.map((group) => (
          <PluginFilterGroup
            key={group.pluginId}
            disabledPlugin={disabledPlugin}
            expanded={expandedPluginIds.has(group.pluginId)}
            group={group}
            onExpandedChange={() => togglePluginGroupExpanded(group.pluginId)}
            onPluginGroupToggle={onPluginGroupToggle}
            onPluginPatternToggle={onPluginPatternToggle}
          />
        ))}
      </PatternList>
    </div>
  );
}
