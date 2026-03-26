import React from 'react';
import type { IGroup } from '../../../../shared/contracts';
import { ChevronIcon } from '../SectionHeader';
import { CustomAddForm } from './CustomAddForm';
import { CustomRow } from './CustomRow';
import type { GroupEditorState } from './useEditorState';

export function CustomGroups({
  userGroups,
  expandedGroupId,
  setExpandedGroupId,
  controller,
}: {
  userGroups: IGroup[];
  expandedGroupId: string | null;
  setExpandedGroupId: (groupId: string | null) => void;
  controller: GroupEditorState;
}): React.ReactElement {
  return (
    <div>
      <button
        onClick={() => controller.setCustomExpanded(!controller.customExpanded)}
        className="flex items-center gap-1.5 w-full py-0.5 text-left hover:bg-accent rounded transition-colors px-1"
      >
        <ChevronIcon open={controller.customExpanded} />
        <span className="text-[11px] font-medium">Custom</span>
        <span className="text-[10px] text-muted-foreground">({userGroups.length})</span>
      </button>
      {controller.customExpanded && (
        <div className="ml-2 mt-1 space-y-1">
          {userGroups.length === 0 ? (
            <p className="text-[10px] text-muted-foreground py-1">No custom groups.</p>
          ) : (
            <ul className="space-y-1">
              {userGroups.map((group, index) => (
                <CustomRow
                  key={group.id}
                  controller={controller}
                  group={group}
                  index={index}
                  isExpanded={expandedGroupId === group.id}
                  setExpandedGroupId={setExpandedGroupId}
                />
              ))}
            </ul>
          )}
          <CustomAddForm controller={controller} />
        </div>
      )}
    </div>
  );
}
