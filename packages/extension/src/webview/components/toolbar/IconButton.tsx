import React from 'react';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/overlay/tooltip';

export function ToolbarIconButton({
  disabled = false,
  description,
  iconPath,
  onClick,
  statusDot = false,
  title,
}: {
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
          className="relative h-7 w-7 bg-transparent"
          onClick={onClick}
          title={title}
          disabled={disabled}
        >
          <MdiIcon path={iconPath} size={16} />
          {statusDot ? (
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400 ring-1 ring-background"
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
