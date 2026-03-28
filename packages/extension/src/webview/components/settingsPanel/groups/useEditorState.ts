import React, { useEffect, useRef, useState } from 'react';
import type { IGroup } from '../../../../shared/contracts';
import { createGroupActions } from './actions';
import { createGroupDragHandlers } from './drag';
import {
  clearTimeoutMap,
  createGroupPersistenceHandlers,
} from './persistence';

export interface GroupEditorState {
  customExpanded: boolean;
  setCustomExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  expandedPluginIds: Set<string>;
  newColor: string;
  setNewColor: React.Dispatch<React.SetStateAction<string>>;
  newPattern: string;
  setNewPattern: React.Dispatch<React.SetStateAction<string>>;
  dragIndex: number | null;
  dragOverIndex: number | null;
  localColorOverrides: Record<string, string>;
  localPatternOverrides: Record<string, string>;
  addGroup: () => void;
  updateGroup: (groupId: string, updates: Partial<IGroup>) => void;
  overridePluginGroup: (group: IGroup, updates: Partial<IGroup>) => void;
  changeGroupColor: (groupId: string, color: string) => void;
  changePluginGroupColor: (group: IGroup, color: string) => void;
  changeGroupPattern: (groupId: string, pattern: string) => void;
  deleteGroup: (groupId: string) => void;
  pickImage: (groupId: string) => void;
  clearImage: (groupId: string) => void;
  togglePluginGroupDisabled: (groupId: string, disabled: boolean) => void;
  togglePluginSectionDisabled: (pluginId: string, disabled: boolean) => void;
  togglePluginExpansion: (sectionId: string) => void;
  startGroupDrag: (index: number) => void;
  overGroupDrag: (event: React.DragEvent, index: number) => void;
  dropGroup: (event: React.DragEvent, targetIndex: number) => void;
  endGroupDrag: () => void;
}

export function useEditorState({
  userGroups,
  setExpandedGroupId,
}: {
  userGroups: IGroup[];
  setExpandedGroupId: (groupId: string | null) => void;
}): GroupEditorState {
  const [customExpanded, setCustomExpanded] = useState(true);
  const [expandedPluginIds, setExpandedPluginIds] = useState<Set<string>>(new Set());
  const [newPattern, setNewPattern] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [localColorOverrides, setLocalColorOverrides] = useState<Record<string, string>>({});
  const [localPatternOverrides, setLocalPatternOverrides] = useState<Record<string, string>>({});
  const colorDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const patternDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      clearTimeoutMap(colorDebounceRef);
      clearTimeoutMap(patternDebounceRef);
    };
  }, []);
  const actions = createGroupActions({
    newColor,
    newPattern,
    setExpandedGroupId,
    setNewColor,
    setNewPattern,
    userGroups,
  });
  const persistence = createGroupPersistenceHandlers({
    colorDebounceRef,
    overridePluginGroup: actions.overridePluginGroup,
    patternDebounceRef,
    setLocalColorOverrides,
    setLocalPatternOverrides,
    updateGroup: actions.updateGroup,
  });
  const drag = createGroupDragHandlers({
    dragIndex,
    sendUserGroups: actions.sendUserGroups,
    setDragIndex,
    setDragOverIndex,
    userGroups,
  });

  const togglePluginExpansion = (sectionId: string) => {
    setExpandedPluginIds((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  return {
    customExpanded,
    setCustomExpanded,
    expandedPluginIds,
    newColor,
    setNewColor,
    newPattern,
    setNewPattern,
    dragIndex,
    dragOverIndex,
    localColorOverrides,
    localPatternOverrides,
    addGroup: actions.addGroup,
    updateGroup: actions.updateGroup,
    overridePluginGroup: actions.overridePluginGroup,
    changeGroupColor: persistence.changeGroupColor,
    changePluginGroupColor: persistence.changePluginGroupColor,
    changeGroupPattern: persistence.changeGroupPattern,
    deleteGroup: actions.deleteGroup,
    pickImage: actions.pickImage,
    clearImage: actions.clearImage,
    togglePluginGroupDisabled: actions.togglePluginGroupDisabled,
    togglePluginSectionDisabled: actions.togglePluginSectionDisabled,
    togglePluginExpansion,
    startGroupDrag: drag.startGroupDrag,
    overGroupDrag: drag.overGroupDrag,
    dropGroup: drag.dropGroup,
    endGroupDrag: drag.endGroupDrag,
  };
}
