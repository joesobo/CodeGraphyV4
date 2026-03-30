import React from 'react';
import { mdiEyeOffOutline, mdiEyeOutline } from '@mdi/js';
import { cn } from '../../../ui/cn';
import { MdiIcon } from '../../../icons/MdiIcon';
import { ChevronIcon } from '../../SectionHeader';
import { DefaultRow } from './Row';
import type { SettingsPanelGroupSection } from '../shared/sections';
import type { GroupEditorState } from '../shared/state/useEditorState';

export function DefaultSection({
  controller,
  expandedGroupId,
  section,
  setExpandedGroupId,
}: {
  controller: GroupEditorState;
  expandedGroupId: string | null;
  section: SettingsPanelGroupSection;
  setExpandedGroupId: (groupId: string | null) => void;
}): React.ReactElement {
  const isExpanded = controller.expandedPluginIds.has(section.sectionId);
  const allDisabled = section.groups.every((group) => group.disabled);

  return (
    <div className={cn(allDisabled && 'opacity-50')}>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => controller.togglePluginExpansion(section.sectionId)}
          className="flex items-center gap-1.5 flex-1 min-w-0 py-0.5 text-left hover:bg-accent rounded transition-colors px-1"
        >
          <ChevronIcon open={isExpanded} />
          <span className="text-[11px] font-medium truncate">
            {section.sectionName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            ({section.groups.length})
          </span>
        </button>
        <button
          className="flex-shrink-0 text-muted-foreground hover:text-foreground p-0.5"
          onClick={() =>
            controller.togglePluginSectionDisabled(
              section.sectionId,
              !allDisabled,
            )}
          title={
            allDisabled
              ? `Enable all ${section.sectionName} groups`
              : `Disable all ${section.sectionName} groups`
          }
        >
          {allDisabled ? (
            <MdiIcon path={mdiEyeOffOutline} size={14} />
          ) : (
            <MdiIcon path={mdiEyeOutline} size={14} />
          )}
        </button>
      </div>
      {isExpanded && (
        <ul className="space-y-1 ml-2 mt-1">
          {section.groups.map((group) => (
            <DefaultRow
              key={group.id}
              controller={controller}
              group={group}
              isExpanded={expandedGroupId === group.id}
              setExpandedGroupId={setExpandedGroupId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
