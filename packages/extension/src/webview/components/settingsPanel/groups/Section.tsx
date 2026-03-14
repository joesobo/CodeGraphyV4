import React, { useEffect, useRef, useState } from 'react';
import {
  type IGroup,
  type NodeShape2D,
  type NodeShape3D,
} from '../../../../shared/types';
import { cn } from '../../../lib/utils';
import { postMessage } from '../../../lib/vscodeApi';
import { useGraphStore } from '../../../store';
import { MdiIcon } from '../../icons';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  mdiChevronRight,
  mdiClose,
  mdiDrag,
  mdiEyeOffOutline,
  mdiEyeOutline,
} from '@mdi/js';
import {
  buildSettingsGroupOverride,
  groupSettingsPanelSections,
  reorderSettingsGroups,
} from './model';

const COLOR_DEBOUNCE_MS = 300;

const SHAPE_2D_OPTIONS: Array<{ value: NodeShape2D; label: string }> = [
  { value: 'circle', label: 'Circle' },
  { value: 'square', label: 'Square' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'star', label: 'Star' },
];

const SHAPE_3D_OPTIONS: Array<{ value: NodeShape3D; label: string }> = [
  { value: 'sphere', label: 'Sphere' },
  { value: 'cube', label: 'Cube' },
  { value: 'octahedron', label: 'Octahedron' },
  { value: 'cone', label: 'Cone' },
  { value: 'dodecahedron', label: 'Dodecahedron' },
  { value: 'icosahedron', label: 'Icosahedron' },
];

function ChevronIcon({ open }: { open: boolean }): React.ReactElement {
  return (
    <MdiIcon
      path={mdiChevronRight}
      size={14}
      className={cn('text-muted-foreground transition-transform', open && 'rotate-90')}
    />
  );
}

function clearTimeoutMap(ref: React.MutableRefObject<Record<string, ReturnType<typeof setTimeout>>>): void {
  for (const timer of Object.values(ref.current)) {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export function GroupsSection(): React.ReactElement {
  const groups = useGraphStore((state) => state.groups);
  const expandedGroupId = useGraphStore((state) => state.expandedGroupId);
  const setExpandedGroupId = useGraphStore((state) => state.setExpandedGroupId);
  const { userGroups, defaultSections } = groupSettingsPanelSections(groups);

  const [newPattern, setNewPattern] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [expandedPluginIds, setExpandedPluginIds] = useState<Set<string>>(new Set());
  const [customExpanded, setCustomExpanded] = useState(true);
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

  const handleAddGroup = () => {
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

  const handleUpdateGroup = (id: string, updates: Partial<IGroup>) => {
    sendUserGroups(userGroups.map((group) => (group.id === id ? { ...group, ...updates } : group)));
  };

  const handleOverridePluginGroup = (group: IGroup, updates: Partial<IGroup>) => {
    const newId = crypto.randomUUID();
    const override = buildSettingsGroupOverride(group, updates, newId);
    sendUserGroups([...userGroups, override]);
    setExpandedGroupId(newId);
  };

  const handleDebouncedColorUpdate = (groupId: string, color: string) => {
    setLocalColorOverrides((current) => ({ ...current, [groupId]: color }));
    if (colorDebounceRef.current[groupId]) {
      clearTimeout(colorDebounceRef.current[groupId]);
    }
    colorDebounceRef.current[groupId] = setTimeout(() => {
      handleUpdateGroup(groupId, { color });
      setLocalColorOverrides((current) => {
        const next = { ...current };
        delete next[groupId];
        return next;
      });
      delete colorDebounceRef.current[groupId];
    }, COLOR_DEBOUNCE_MS);
  };

  const handleDebouncedPluginColorOverride = (group: IGroup, color: string) => {
    setLocalColorOverrides((current) => ({ ...current, [group.id]: color }));
    if (colorDebounceRef.current[group.id]) {
      clearTimeout(colorDebounceRef.current[group.id]);
    }
    colorDebounceRef.current[group.id] = setTimeout(() => {
      handleOverridePluginGroup(group, { color });
      setLocalColorOverrides((current) => {
        const next = { ...current };
        delete next[group.id];
        return next;
      });
      delete colorDebounceRef.current[group.id];
    }, COLOR_DEBOUNCE_MS);
  };

  const handleDebouncedPatternUpdate = (groupId: string, pattern: string) => {
    setLocalPatternOverrides((current) => ({ ...current, [groupId]: pattern }));
    if (patternDebounceRef.current[groupId]) {
      clearTimeout(patternDebounceRef.current[groupId]);
    }
    patternDebounceRef.current[groupId] = setTimeout(() => {
      handleUpdateGroup(groupId, { pattern });
      setLocalPatternOverrides((current) => {
        const next = { ...current };
        delete next[groupId];
        return next;
      });
      delete patternDebounceRef.current[groupId];
    }, COLOR_DEBOUNCE_MS);
  };

  const handleDeleteGroup = (groupId: string) => {
    sendUserGroups(userGroups.filter((group) => group.id !== groupId));
  };

  const handlePickImage = (groupId: string) => {
    postMessage({ type: 'PICK_GROUP_IMAGE', payload: { groupId } });
  };

  const handleClearImage = (groupId: string) => {
    handleUpdateGroup(groupId, { imagePath: undefined, imageUrl: undefined });
  };

  const handleTogglePluginGroupDisabled = (groupId: string, disabled: boolean) => {
    postMessage({ type: 'TOGGLE_PLUGIN_GROUP_DISABLED', payload: { groupId, disabled } });
  };

  const handleTogglePluginSectionDisabled = (pluginId: string, disabled: boolean) => {
    postMessage({ type: 'TOGGLE_PLUGIN_SECTION_DISABLED', payload: { pluginId, disabled } });
  };

  const handleGroupDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    setDragOverIndex(index);
  };

  const handleGroupDrop = (event: React.DragEvent, targetIndex: number) => {
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

  return (
    <div className="mb-2 space-y-2">
      <div>
        <button
          onClick={() => setCustomExpanded((open) => !open)}
          className="flex items-center gap-1.5 w-full py-0.5 text-left hover:bg-accent rounded transition-colors px-1"
        >
          <ChevronIcon open={customExpanded} />
          <span className="text-[11px] font-medium">Custom</span>
          <span className="text-[10px] text-muted-foreground">({userGroups.length})</span>
        </button>
        {customExpanded && (
          <div className="ml-2 mt-1 space-y-1">
            {userGroups.length === 0 ? (
              <p className="text-[10px] text-muted-foreground py-1">No custom groups.</p>
            ) : (
              <ul className="space-y-1">
                {userGroups.map((group, index) => {
                  const isExpanded = expandedGroupId === group.id;
                  const displayColor = localColorOverrides[group.id] ?? group.color;
                  return (
                    <li
                      key={group.id}
                      draggable={!isExpanded}
                      onDragStart={() => setDragIndex(index)}
                      onDragOver={(event) => handleGroupDragOver(event, index)}
                      onDrop={(event) => handleGroupDrop(event, index)}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setDragOverIndex(null);
                      }}
                      className={cn(
                        'rounded transition-colors',
                        dragOverIndex === index && dragIndex !== index && 'bg-accent outline outline-1 outline-primary/50',
                        dragIndex === index && 'opacity-40',
                        isExpanded && 'bg-accent/50 p-1.5',
                        group.disabled && 'opacity-50'
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
                          <img src={group.imageUrl} alt="" className="w-4 h-4 object-cover rounded-sm flex-shrink-0" />
                        )}
                        <button
                          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleUpdateGroup(group.id, { disabled: !group.disabled });
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
                            handleDeleteGroup(group.id);
                          }}
                          title="Delete group"
                        >
                          <MdiIcon path={mdiClose} size={14} />
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className="mt-2 space-y-2 pl-5">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Pattern</Label>
                            <Input
                              value={localPatternOverrides[group.id] ?? group.pattern}
                              onChange={(event) => handleDebouncedPatternUpdate(group.id, event.target.value)}
                              className="h-6 text-xs"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-[10px] text-muted-foreground">Color</Label>
                            <input
                              type="color"
                              value={displayColor}
                              onChange={(event) => handleDebouncedColorUpdate(group.id, event.target.value)}
                              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">2D Shape</Label>
                            <select
                              value={group.shape2D ?? 'circle'}
                              onChange={(event) => handleUpdateGroup(group.id, { shape2D: event.target.value as NodeShape2D })}
                              className="w-full h-6 text-xs bg-background border rounded px-1"
                            >
                              {SHAPE_2D_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">3D Shape</Label>
                            <select
                              value={group.shape3D ?? 'sphere'}
                              onChange={(event) => handleUpdateGroup(group.id, { shape3D: event.target.value as NodeShape3D })}
                              className="w-full h-6 text-xs bg-background border rounded px-1"
                            >
                              {SHAPE_3D_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Image</Label>
                            <div className="flex items-center gap-1.5">
                              {group.imageUrl ? (
                                <>
                                  <img src={group.imageUrl} alt="" className="w-8 h-8 object-cover rounded border" />
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-6 px-2 text-[10px]"
                                    onClick={() => handleClearImage(group.id)}
                                  >
                                    Clear
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="h-6 px-2 text-[10px]"
                                  onClick={() => handlePickImage(group.id)}
                                >
                                  Choose Image...
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex items-center gap-1.5 pt-1">
              <Input
                value={newPattern}
                onChange={(event) => setNewPattern(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleAddGroup()}
                placeholder="src/**"
                className="flex-1 h-7 text-xs min-w-0"
              />
              <input
                type="color"
                value={newColor}
                onChange={(event) => setNewColor(event.target.value)}
                className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                title="Pick color"
              />
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleAddGroup}
                disabled={!newPattern.trim()}
              >
                Add
              </Button>
            </div>
          </div>
        )}
      </div>

      {defaultSections.map(({ sectionId, sectionName, groups: sectionGroups }) => {
        const isExpanded = expandedPluginIds.has(sectionId);
        const allDisabled = sectionGroups.every((group) => group.disabled);
        return (
          <div key={sectionId} className={cn(allDisabled && 'opacity-50')}>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setExpandedPluginIds((current) => {
                    const next = new Set(current);
                    if (next.has(sectionId)) {
                      next.delete(sectionId);
                    } else {
                      next.add(sectionId);
                    }
                    return next;
                  });
                }}
                className="flex items-center gap-1.5 flex-1 min-w-0 py-0.5 text-left hover:bg-accent rounded transition-colors px-1"
              >
                <ChevronIcon open={isExpanded} />
                <span className="text-[11px] font-medium truncate">{sectionName}</span>
                <span className="text-[10px] text-muted-foreground">({sectionGroups.length})</span>
              </button>
              <button
                className="flex-shrink-0 text-muted-foreground hover:text-foreground p-0.5"
                onClick={() => handleTogglePluginSectionDisabled(sectionId, !allDisabled)}
                title={allDisabled ? `Enable all ${sectionName} groups` : `Disable all ${sectionName} groups`}
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
                {sectionGroups.map((group) => {
                  const groupExpanded = expandedGroupId === group.id;
                  const displayColor = localColorOverrides[group.id] ?? group.color;
                  return (
                    <li
                      key={group.id}
                      className={cn(
                        'rounded transition-colors',
                        groupExpanded && 'bg-accent/50 p-1.5',
                        group.disabled && 'opacity-50'
                      )}
                    >
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => setExpandedGroupId(groupExpanded ? null : group.id)}
                      >
                        <span
                          className="w-4 h-4 rounded-sm flex-shrink-0 border"
                          style={{ backgroundColor: displayColor }}
                        />
                        <span className="text-xs flex-1 truncate font-mono">{group.pattern}</span>
                        {group.imageUrl && (
                          <img src={group.imageUrl} alt="" className="w-4 h-4 object-cover rounded-sm flex-shrink-0" />
                        )}
                        <button
                          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleTogglePluginGroupDisabled(group.id, !group.disabled);
                          }}
                          title={group.disabled ? 'Enable group' : 'Disable group'}
                        >
                          {group.disabled ? (
                            <MdiIcon path={mdiEyeOffOutline} size={14} />
                          ) : (
                            <MdiIcon path={mdiEyeOutline} size={14} />
                          )}
                        </button>
                        <ChevronIcon open={groupExpanded} />
                      </div>
                      {groupExpanded && (
                        <div className="mt-2 space-y-2 pl-4">
                          <p className="text-[10px] text-muted-foreground italic">
                            Editing will create a custom override
                          </p>
                          <div className="flex items-center gap-2">
                            <Label className="text-[10px] text-muted-foreground">Color</Label>
                            <input
                              type="color"
                              value={displayColor}
                              onChange={(event) => handleDebouncedPluginColorOverride(group, event.target.value)}
                              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">2D Shape</Label>
                            <select
                              value={group.shape2D ?? 'circle'}
                              onChange={(event) => handleOverridePluginGroup(group, { shape2D: event.target.value as NodeShape2D })}
                              className="w-full h-6 text-xs bg-background border rounded px-1"
                            >
                              {SHAPE_2D_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">3D Shape</Label>
                            <select
                              value={group.shape3D ?? 'sphere'}
                              onChange={(event) => handleOverridePluginGroup(group, { shape3D: event.target.value as NodeShape3D })}
                              className="w-full h-6 text-xs bg-background border rounded px-1"
                            >
                              {SHAPE_3D_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
