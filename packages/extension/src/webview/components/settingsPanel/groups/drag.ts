import type React from 'react';
import type { IGroup } from '../../../../shared/contracts';
import { reorderSettingsGroups } from './reorder';

interface GroupDragDependencies {
  dragIndex: number | null;
  sendUserGroups: (groups: IGroup[]) => void;
  setDragIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setDragOverIndex: React.Dispatch<React.SetStateAction<number | null>>;
  userGroups: IGroup[];
}

export function createGroupDragHandlers(
  dependencies: GroupDragDependencies,
): {
  dropGroup: (event: React.DragEvent, targetIndex: number) => void;
  endGroupDrag: () => void;
  overGroupDrag: (event: React.DragEvent, index: number) => void;
  startGroupDrag: (index: number) => void;
} {
  return {
    dropGroup: (event: React.DragEvent, targetIndex: number) => {
      event.preventDefault();
      if (dependencies.dragIndex === null) {
        dependencies.setDragIndex(null);
        dependencies.setDragOverIndex(null);
        return;
      }

      dependencies.sendUserGroups(
        reorderSettingsGroups(
          dependencies.userGroups,
          dependencies.dragIndex,
          targetIndex,
        ),
      );
      dependencies.setDragIndex(null);
      dependencies.setDragOverIndex(null);
    },
    endGroupDrag: () => {
      dependencies.setDragIndex(null);
      dependencies.setDragOverIndex(null);
    },
    overGroupDrag: (event: React.DragEvent, index: number) => {
      event.preventDefault();
      dependencies.setDragOverIndex(index);
    },
    startGroupDrag: (index: number) => {
      dependencies.setDragIndex(index);
    },
  };
}
