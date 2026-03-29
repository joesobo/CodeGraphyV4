import React from 'react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import type { GroupEditorState } from '../shared/state/useEditorState';

export function CustomAddForm({
  controller,
}: {
  controller: GroupEditorState;
}): React.ReactElement {
  return (
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
  );
}
