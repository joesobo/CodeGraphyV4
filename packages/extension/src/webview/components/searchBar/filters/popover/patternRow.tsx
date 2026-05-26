import React from 'react';
import { mdiClose } from '@mdi/js';
import { MdiIcon } from '../../../icons/MdiIcon';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Switch } from '../../../ui/switch';
import { cn } from '../../../ui/cn';

interface PatternRowProps {
  enabled: boolean;
  onDelete?: () => void;
  onEdit?: (value: string) => void;
  onEnabledChange: (enabled: boolean) => void;
  pattern: string;
  source: 'custom' | 'plugin';
}

export function PatternRow({
  enabled,
  onDelete,
  onEdit,
  onEnabledChange,
  pattern,
  source,
}: PatternRowProps): React.ReactElement {
  const inputId = `filter-pattern-${source}-${pattern}`;
  const commitEdit = (value: string): void => onEdit?.(value);

  return (
    <li className={cn('flex items-center gap-2', !enabled && 'opacity-60')}>
      <Switch
        id={inputId}
        checked={enabled}
        onCheckedChange={onEnabledChange}
        aria-label={`${enabled ? 'Disable' : 'Enable'} ${source} filter ${pattern}`}
      />
      <Input
        defaultValue={pattern}
        readOnly={source === 'plugin'}
        aria-label={source === 'plugin' ? `Plugin filter pattern ${pattern}` : `Edit filter pattern ${pattern}`}
        className={cn(
          'h-7 min-w-0 flex-1 border-0 bg-transparent px-0 font-mono text-xs shadow-none focus-visible:ring-0',
          source === 'plugin' && 'cursor-default text-muted-foreground',
        )}
        onBlur={(event) => commitEdit(event.target.value)}
        onKeyDown={(event) => handlePatternInputKeyDown(event, commitEdit)}
      />
      {source === 'custom' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 flex-shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          title="Delete pattern"
        >
          <MdiIcon path={mdiClose} size={14} />
        </Button>
      )}
    </li>
  );
}

function handlePatternInputKeyDown(
  event: React.KeyboardEvent<HTMLInputElement>,
  onCommit: (value: string) => void,
): void {
  if (event.key !== 'Enter') {
    return;
  }

  onCommit(event.currentTarget.value);
  event.currentTarget.blur();
}
