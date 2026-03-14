import React from 'react';
import { mdiEyeOffOutline, mdiEyeOutline } from '@mdi/js';
import type { NodeShape2D, NodeShape3D } from '../../../../shared/types';
import { cn } from '../../../lib/utils';
import { MdiIcon } from '../../icons';
import { ChevronIcon } from '../SectionHeader';
import { Label } from '../../ui/label';
import { SHAPE_2D_OPTIONS, SHAPE_3D_OPTIONS } from './options';
import type { SettingsPanelGroupSection } from './model';
import type { GroupEditorState } from './useEditorState';

export function DefaultGroups({
  defaultSections,
  expandedGroupId,
  setExpandedGroupId,
  controller,
}: {
  defaultSections: SettingsPanelGroupSection[];
  expandedGroupId: string | null;
  setExpandedGroupId: (groupId: string | null) => void;
  controller: GroupEditorState;
}): React.ReactElement {
  return (
    <>
      {defaultSections.map(({ sectionId, sectionName, groups }) => {
        const isExpanded = controller.expandedPluginIds.has(sectionId);
        const allDisabled = groups.every((group) => group.disabled);
        return (
          <div key={sectionId} className={cn(allDisabled && 'opacity-50')}>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => controller.togglePluginExpansion(sectionId)}
                className="flex items-center gap-1.5 flex-1 min-w-0 py-0.5 text-left hover:bg-accent rounded transition-colors px-1"
              >
                <ChevronIcon open={isExpanded} />
                <span className="text-[11px] font-medium truncate">{sectionName}</span>
                <span className="text-[10px] text-muted-foreground">({groups.length})</span>
              </button>
              <button
                className="flex-shrink-0 text-muted-foreground hover:text-foreground p-0.5"
                onClick={() => controller.togglePluginSectionDisabled(sectionId, !allDisabled)}
                title={allDisabled ? `Enable all ${sectionName} groups` : `Disable all ${sectionName} groups`}
              >
                {allDisabled ? <MdiIcon path={mdiEyeOffOutline} size={14} /> : <MdiIcon path={mdiEyeOutline} size={14} />}
              </button>
            </div>
            {isExpanded && (
              <ul className="space-y-1 ml-2 mt-1">
                {groups.map((group) => {
                  const groupExpanded = expandedGroupId === group.id;
                  const displayColor = controller.localColorOverrides[group.id] ?? group.color;
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
                              onChange={(event) => controller.changePluginGroupColor(group, event.target.value)}
                              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">2D Shape</Label>
                            <select
                              value={group.shape2D ?? 'circle'}
                              onChange={(event) => controller.overridePluginGroup(group, { shape2D: event.target.value as NodeShape2D })}
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
                              onChange={(event) => controller.overridePluginGroup(group, { shape3D: event.target.value as NodeShape3D })}
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
    </>
  );
}
