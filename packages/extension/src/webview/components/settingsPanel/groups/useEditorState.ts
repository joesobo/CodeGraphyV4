import React, { useEffect, useRef, useState } from 'react';
import type { IGroup } from '../../../../shared/types';
import { postMessage } from '../../../lib/vscodeApi';
import { buildSettingsGroupOverride, reorderSettingsGroups } from './model';

const COLOR_DEBOUNCE_MS = 300;

function clearTimeoutMap(ref: React.MutableRefObject<Record<string, ReturnType<typeof setTimeout>>>): void {
  for (const timer of Object.values(ref.current)) {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

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

  const sendUserGroups = (updated: IGroup[]) => {
    postMessage({ type: 'UPDATE_GROUPS', payload: { groups: updated } });
  };

  const addGroup = () => {
    const pattern = newPattern.trim();
    if (!pattern) {
      return;
    }

    const newId = crypto.randomUUID();
    sendUserGroups([...userGroups, { id: newId, pattern, color: newColor }]);
    setNewPattern('');
    setNewColor('#3B82F6');
    setExpandedGroupId(newId);
  };

  const updateGroup = (groupId: string, updates: Partial<IGroup>) => {
    sendUserGroups(userGroups.map((group) => (group.id === groupId ? { ...group, ...updates } : group)));
  };

  const overridePluginGroup = (group: IGroup, updates: Partial<IGroup>) => {
    const newId = crypto.randomUUID();
    const override = buildSettingsGroupOverride(group, updates, newId);
    sendUserGroups([...userGroups, override]);
    setExpandedGroupId(newId);
  };

  const changeGroupColor = (groupId: string, color: string) => {
    setLocalColorOverrides((current) => ({ ...current, [groupId]: color }));
    if (colorDebounceRef.current[groupId]) {
      clearTimeout(colorDebounceRef.current[groupId]);
    }
    colorDebounceRef.current[groupId] = setTimeout(() => {
      updateGroup(groupId, { color });
      setLocalColorOverrides((current) => {
        const next = { ...current };
        delete next[groupId];
        return next;
      });
      delete colorDebounceRef.current[groupId];
    }, COLOR_DEBOUNCE_MS);
  };

  const changePluginGroupColor = (group: IGroup, color: string) => {
    setLocalColorOverrides((current) => ({ ...current, [group.id]: color }));
    if (colorDebounceRef.current[group.id]) {
      clearTimeout(colorDebounceRef.current[group.id]);
    }
    colorDebounceRef.current[group.id] = setTimeout(() => {
      overridePluginGroup(group, { color });
      setLocalColorOverrides((current) => {
        const next = { ...current };
        delete next[group.id];
        return next;
      });
      delete colorDebounceRef.current[group.id];
    }, COLOR_DEBOUNCE_MS);
  };

  const changeGroupPattern = (groupId: string, pattern: string) => {
    setLocalPatternOverrides((current) => ({ ...current, [groupId]: pattern }));
    if (patternDebounceRef.current[groupId]) {
      clearTimeout(patternDebounceRef.current[groupId]);
    }
    patternDebounceRef.current[groupId] = setTimeout(() => {
      updateGroup(groupId, { pattern });
      setLocalPatternOverrides((current) => {
        const next = { ...current };
        delete next[groupId];
        return next;
      });
      delete patternDebounceRef.current[groupId];
    }, COLOR_DEBOUNCE_MS);
  };

  const deleteGroup = (groupId: string) => {
    sendUserGroups(userGroups.filter((group) => group.id !== groupId));
  };

  const pickImage = (groupId: string) => {
    postMessage({ type: 'PICK_GROUP_IMAGE', payload: { groupId } });
  };

  const clearImage = (groupId: string) => {
    updateGroup(groupId, { imagePath: undefined, imageUrl: undefined });
  };

  const togglePluginGroupDisabled = (groupId: string, disabled: boolean) => {
    postMessage({ type: 'TOGGLE_PLUGIN_GROUP_DISABLED', payload: { groupId, disabled } });
  };

  const togglePluginSectionDisabled = (pluginId: string, disabled: boolean) => {
    postMessage({ type: 'TOGGLE_PLUGIN_SECTION_DISABLED', payload: { pluginId, disabled } });
  };

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

  const startGroupDrag = (index: number) => {
    setDragIndex(index);
  };

  const overGroupDrag = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    setDragOverIndex(index);
  };

  const dropGroup = (event: React.DragEvent, targetIndex: number) => {
    event.preventDefault();
    if (dragIndex === null) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    sendUserGroups(reorderSettingsGroups(userGroups, dragIndex, targetIndex));
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const endGroupDrag = () => {
    setDragIndex(null);
    setDragOverIndex(null);
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
    addGroup,
    updateGroup,
    overridePluginGroup,
    changeGroupColor,
    changePluginGroupColor,
    changeGroupPattern,
    deleteGroup,
    pickImage,
    clearImage,
    togglePluginGroupDisabled,
    togglePluginSectionDisabled,
    togglePluginExpansion,
    startGroupDrag,
    overGroupDrag,
    dropGroup,
    endGroupDrag,
  };
}
