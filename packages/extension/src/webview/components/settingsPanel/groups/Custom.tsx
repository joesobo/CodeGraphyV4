import React from 'react';
import { mdiClose, mdiDrag, mdiEyeOffOutline, mdiEyeOutline } from '@mdi/js';
import type { IGroup, NodeShape2D, NodeShape3D } from '../../../../shared/types';
import { cn } from '../../../lib/utils';
import { MdiIcon } from '../../icons';
import { ChevronIcon } from '../SectionHeader';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { SHAPE_2D_OPTIONS, SHAPE_3D_OPTIONS } from './options';
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
              {userGroups.map((group, index) => {
                const isExpanded = expandedGroupId === group.id;
                const displayColor = controller.localColorOverrides[group.id] ?? group.color;
                return (
                  <li
                    key={group.id}
                    draggable={!isExpanded}
                    onDragStart={() => controller.startGroupDrag(index)}
                    onDragOver={(event) => controller.overGroupDrag(event, index)}
                    onDrop={(event) => controller.dropGroup(event, index)}
                    onDragEnd={controller.endGroupDrag}
                    className={cn(
                      'rounded transition-colors',
                      controller.dragOverIndex === index && controller.dragIndex !== index && 'bg-accent outline outline-1 outline-primary/50',
                      controller.dragIndex === index && 'opacity-40',
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
                      <div className="mt-2 space-y-2 pl-5">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Pattern</Label>
                          <Input
                            value={controller.localPatternOverrides[group.id] ?? group.pattern}
                            onChange={(event) => controller.changeGroupPattern(group.id, event.target.value)}
                            className="h-6 text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-[10px] text-muted-foreground">Color</Label>
                          <input
                            type="color"
                            value={displayColor}
                            onChange={(event) => controller.changeGroupColor(group.id, event.target.value)}
                            className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">2D Shape</Label>
                          <select
                            value={group.shape2D ?? 'circle'}
                            onChange={(event) => controller.updateGroup(group.id, { shape2D: event.target.value as NodeShape2D })}
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
                            onChange={(event) => controller.updateGroup(group.id, { shape3D: event.target.value as NodeShape3D })}
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
                                  onClick={() => controller.clearImage(group.id)}
                                >
                                  Clear
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-6 px-2 text-[10px]"
                                onClick={() => controller.pickImage(group.id)}
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
              value={controller.newPattern}
              onChange={(event) => controller.setNewPattern(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && controller.addGroup()}
              placeholder="src/**"
              className="flex-1 h-7 text-xs min-w-0"
            />
            <input
              type="color"
              value={controller.newColor}
              onChange={(event) => controller.setNewColor(event.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
              title="Pick color"
            />
            <Button
              variant="secondary"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={controller.addGroup}
              disabled={!controller.newPattern.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
