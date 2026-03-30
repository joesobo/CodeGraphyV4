import React from 'react';
import type { IGroup } from '../../../../../shared/settings/groups';
import { CustomEditor } from './Editor';
import { CustomRowHeader } from './RowHeader';
import { getCustomRowClassName, isCustomRowDraggable } from '../shared/rowState';
import type { GroupEditorState } from '../shared/state/useEditorState';

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
      draggable={isCustomRowDraggable(isExpanded)}
      onDragStart={() => controller.startGroupDrag(index)}
      onDragOver={(event) => controller.overGroupDrag(event, index)}
      onDrop={(event) => controller.dropGroup(event, index)}
      onDragEnd={controller.endGroupDrag}
      className={getCustomRowClassName({
        dragIndex: controller.dragIndex,
        dragOverIndex: controller.dragOverIndex,
        groupDisabled: group.disabled,
        index,
        isExpanded,
      })}
    >
      <CustomRowHeader
        controller={controller}
        displayColor={displayColor}
        group={group}
        isExpanded={isExpanded}
        setExpandedGroupId={setExpandedGroupId}
      />

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
