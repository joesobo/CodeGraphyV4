import React from 'react';
import { mdiEyeOffOutline, mdiEyeOutline } from '@mdi/js';
import type { IGroup } from '../../../../shared/contracts';
import { cn } from '../../ui/cn';
import { MdiIcon } from '../../icons/MdiIcon';
import { ChevronIcon } from '../SectionHeader';
import { DefaultEditor } from './DefaultEditor';
import type { GroupEditorState } from './useEditorState';

export function DefaultRow({
  controller,
  group,
  isExpanded,
  setExpandedGroupId,
}: {
  controller: GroupEditorState;
  group: IGroup;
  isExpanded: boolean;
  setExpandedGroupId: (groupId: string | null) => void;
}): React.ReactElement {
  const displayColor = controller.localColorOverrides[group.id] ?? group.color;

  return (
    <li
      className={cn(
        'rounded transition-colors',
        isExpanded && 'bg-accent/50 p-1.5',
        group.disabled && 'opacity-50',
      )}
    >
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
      >
        <span
          className="w-4 h-4 rounded-sm flex-shrink-0 border"
          style={{ backgroundColor: displayColor }}
        />
        <span className="text-xs flex-1 truncate font-mono">{group.pattern}</span>
        {group.imageUrl && (
          <img
            src={group.imageUrl}
            alt=""
            className="w-4 h-4 object-cover rounded-sm flex-shrink-0"
          />
        )}
        <button
          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          onClick={(event) => {
            event.stopPropagation();
            controller.togglePluginGroupDisabled(group.id, !group.disabled);
          }}
          title={group.disabled ? 'Enable group' : 'Disable group'}
        >
          {group.disabled ? (
            <MdiIcon path={mdiEyeOffOutline} size={14} />
          ) : (
            <MdiIcon path={mdiEyeOutline} size={14} />
          )}
        </button>
        <ChevronIcon open={isExpanded} />
      </div>
      {isExpanded && (
        <DefaultEditor
          controller={controller}
          displayColor={displayColor}
          group={group}
        />
      )}
    </li>
  );
}
