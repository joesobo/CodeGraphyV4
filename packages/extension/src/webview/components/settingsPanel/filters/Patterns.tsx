import React from 'react';
import { mdiClose, mdiLockOutline } from '@mdi/js';
import { MdiIcon } from '../../icons/MdiIcon';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { canAddFilterPattern, shouldShowPluginFilterPatterns } from './model';

export function Patterns({
  filterPatterns,
  newFilterPattern,
  onAdd,
  onDelete,
  onPatternChange,
  pluginFilterPatterns,
}: {
  filterPatterns: string[];
  newFilterPattern: string;
  onAdd: () => void;
  onDelete: (pattern: string) => void;
  onPatternChange: (value: string) => void;
  pluginFilterPatterns: string[];
}): React.ReactElement {
  const addButtonDisabled = !canAddFilterPattern(newFilterPattern);

  return (
    <>
      {shouldShowPluginFilterPatterns(pluginFilterPatterns) && (
        <>
          <p className="text-xs text-muted-foreground">Plugin defaults (read-only)</p>
          <ul className="space-y-1">
            {pluginFilterPatterns.map((pattern) => (
              <li key={pattern} className="flex items-center gap-2 opacity-60">
                <MdiIcon
                  path={mdiLockOutline}
                  size={12}
                  className="text-muted-foreground flex-shrink-0"
                />
                <span className="text-xs text-muted-foreground flex-1 truncate font-mono">
                  {pattern}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="text-xs text-muted-foreground">Custom (exclude from graph)</p>
      {filterPatterns.length === 0 ? (
        <p className="text-xs text-muted-foreground">No patterns.</p>
      ) : (
        <ul className="space-y-1">
          {filterPatterns.map((pattern) => (
            <li key={pattern} className="flex items-center gap-2">
              <span className="text-xs flex-1 truncate font-mono">{pattern}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-destructive flex-shrink-0"
                onClick={() => onDelete(pattern)}
                title="Delete pattern"
              >
                <MdiIcon path={mdiClose} size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-1.5 pt-1">
        <Input
          value={newFilterPattern}
          onChange={(event) => onPatternChange(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && onAdd()}
          placeholder="*.png"
          className="flex-1 h-7 text-xs min-w-0"
        />
        <Button
          variant="secondary"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onAdd}
          disabled={addButtonDisabled}
        >
          Add
        </Button>
      </div>
    </>
  );
}
