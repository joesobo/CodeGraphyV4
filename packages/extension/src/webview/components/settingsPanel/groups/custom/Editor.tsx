import React from 'react';
import type { NodeShape2D, NodeShape3D } from '../../../../../shared/settings/modes';
import type { IGroup } from '../../../../../shared/settings/groups';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/form/label';
import { SHAPE_2D_OPTIONS, SHAPE_3D_OPTIONS } from '../shared/options';
import type { GroupEditorState } from '../shared/state/useEditorState';

export function resolveCustomShape2D(group: IGroup): NodeShape2D {
  return group.shape2D ?? 'circle';
}

export function resolveCustomShape3D(group: IGroup): NodeShape3D {
  return group.shape3D ?? 'sphere';
}

export function CustomEditor({
  controller,
  displayColor,
  group,
}: {
  controller: GroupEditorState;
  displayColor: string;
  group: IGroup;
}): React.ReactElement {
  return (
    <div className="mt-2 space-y-2 pl-5">
      <div>
        <Label className="text-[10px] text-muted-foreground">Pattern</Label>
        <Input
          value={controller.localPatternOverrides[group.id] ?? group.pattern}
          onChange={(event) =>
            controller.changeGroupPattern(group.id, event.target.value)}
          className="h-6 text-xs"
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-[10px] text-muted-foreground">Color</Label>
        <input
          type="color"
          value={displayColor}
          onChange={(event) =>
            controller.changeGroupColor(group.id, event.target.value)}
          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
        />
      </div>
      <div>
        <Label className="text-[10px] text-muted-foreground">2D Shape</Label>
        <select
          value={resolveCustomShape2D(group)}
          onChange={(event) =>
            controller.updateGroup(group.id, {
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
          value={resolveCustomShape3D(group)}
          onChange={(event) =>
            controller.updateGroup(group.id, {
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
      <div>
        <Label className="text-[10px] text-muted-foreground">Image</Label>
        <div className="flex items-center gap-1.5">
          {group.imageUrl ? (
            <>
              <img
                src={group.imageUrl}
                alt=""
                className="w-8 h-8 object-cover rounded border"
              />
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
  );
}
