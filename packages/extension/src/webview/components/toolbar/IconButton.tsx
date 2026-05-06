import React from 'react';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { cn } from '../ui/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/overlay/tooltip';

export function ToolbarIconButton({
  active = false,
  disabled = false,
  description,
  iconPath,
  onClick,
  statusDot = false,
  title,
}: {
  active?: boolean;
  disabled?: boolean;
  description?: string;
  iconPath: string;
  onClick: () => void;
  statusDot?: boolean;
  title: string;
}): React.ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-pressed={active || undefined}
          className={cn(
            'relative h-7 w-7 bg-transparent',
            active && 'border-[var(--cg-primary-ring)] bg-[var(--cg-primary-faint)] text-primary',
            active && 'before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:rounded-full before:bg-primary',
          )}
          onClick={onClick}
          title={title}
          disabled={disabled}
        >
          <MdiIcon path={iconPath} size={16} />
          {statusDot ? (
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--cg-warning)] ring-1 ring-background"
            />
          ) : null}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <div className="space-y-1">
          <div>{title}</div>
          {description ? (
            <div className="max-w-52 text-[11px] text-muted-foreground">{description}</div>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
