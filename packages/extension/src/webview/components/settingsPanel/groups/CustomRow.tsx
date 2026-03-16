import React from 'react';
import { mdiClose, mdiDrag, mdiEyeOffOutline, mdiEyeOutline } from '@mdi/js';
import type { IGroup } from '../../../../shared/types';
import { cn } from '../../../lib/utils';
import { MdiIcon } from '../../icons';
import { Button } from '../../ui/button';
import { ChevronIcon } from '../SectionHeader';
import { CustomEditor } from './CustomEditor';
import type { GroupEditorState } from './useEditorState';

export function CustomRow({
  controller,
  group,
  index,
  isExpanded,
  setExpandedGroupId,
}: {
  controller: GroupEditorState;
  group: IGroup;
  index: number;
  isExpanded: boolean;
  setExpandedGroupId: (groupId: string | null) => void;
}): React.ReactElement {
  const displayColor = controller.localColorOverrides[group.id] ?? group.color;

  return (
    <li
      draggable={!isExpanded}
      onDragStart={() => controller.startGroupDrag(index)}
      onDragOver={(event) => controller.overGroupDrag(event, index)}
      onDrop={(event) => controller.dropGroup(event, index)}
      onDragEnd={controller.endGroupDrag}
      className={cn(
        'rounded transition-colors',
        controller.dragOverIndex === index
          && controller.dragIndex !== index
          && 'bg-accent outline outline-1 outline-primary/50',
        controller.dragIndex === index && 'opacity-40',
        isExpanded && 'bg-accent/50 p-1.5',
        group.disabled && 'opacity-50',
      )}
    >
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
      >
        <MdiIcon
          path={mdiDrag}
          size={12}
          className="text-muted-foreground flex-shrink-0 cursor-grab active:cursor-grabbing"
        />
        <span
          className="w-4 h-4 rounded-sm flex-shrink-0 border"
          style={{ backgroundColor: displayColor }}
        />
        <span className="text-xs flex-1 truncate font-mono">{group.pattern}</span>
        {group.shape2D && group.shape2D !== 'circle' && (
          <span className="text-[10px] text-muted-foreground">{group.shape2D}</span>
        )}
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
            controller.updateGroup(group.id, { disabled: !group.disabled });
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
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-destructive flex-shrink-0"
          onClick={(event) => {
            event.stopPropagation();
            controller.deleteGroup(group.id);
          }}
          title="Delete group"
        >
          <MdiIcon path={mdiClose} size={14} />
        </Button>
      </div>

      {isExpanded && (
        <CustomEditor
          controller={controller}
          displayColor={displayColor}
          group={group}
        />
      )}
    </li>
  );
}
