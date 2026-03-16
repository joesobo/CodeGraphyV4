import React from 'react';
import type { IGroup } from '../../../../shared/types';
import { CustomEditor } from './CustomEditor';
import { CustomRowHeader } from './CustomRowHeader';
import { getCustomRowClassName, isCustomRowDraggable } from './customRowState';
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
