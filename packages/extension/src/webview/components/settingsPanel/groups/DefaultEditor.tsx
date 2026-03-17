import React from 'react';
import type { IGroup, NodeShape2D, NodeShape3D } from '../../../../shared/types';
import { Label } from '../../ui/label';
import { SHAPE_2D_OPTIONS, SHAPE_3D_OPTIONS } from './options';
import type { GroupEditorState } from './useEditorState';

export function resolveDefaultShape2D(group: IGroup): NodeShape2D {
  return group.shape2D ?? 'circle';
}

export function resolveDefaultShape3D(group: IGroup): NodeShape3D {
  return group.shape3D ?? 'sphere';
}

export function DefaultEditor({
  controller,
  displayColor,
  group,
}: {
  controller: GroupEditorState;
  displayColor: string;
  group: IGroup;
}): React.ReactElement {
  return (
    <div className="mt-2 space-y-2 pl-4">
      <p className="text-[10px] text-muted-foreground italic">
        Editing will create a custom override
      </p>
      <div className="flex items-center gap-2">
        <Label className="text-[10px] text-muted-foreground">Color</Label>
        <input
          type="color"
          value={displayColor}
          onChange={(event) =>
            controller.changePluginGroupColor(group, event.target.value)}
          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
        />
      </div>
      <div>
        <Label className="text-[10px] text-muted-foreground">2D Shape</Label>
        <select
          value={resolveDefaultShape2D(group)}
          onChange={(event) =>
            controller.overridePluginGroup(group, {
              shape2D: event.target.value as NodeShape2D,
            })}
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
          value={resolveDefaultShape3D(group)}
          onChange={(event) =>
            controller.overridePluginGroup(group, {
              shape3D: event.target.value as NodeShape3D,
            })}
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
  );
}
