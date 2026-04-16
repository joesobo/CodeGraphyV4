import React from 'react';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/overlay/tooltip';

export function ToolbarIconButton({
  disabled = false,
  iconPath,
  onClick,
  title,
}: {
  disabled?: boolean;
  iconPath: string;
  onClick: () => void;
  title: string;
}): React.ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 bg-transparent"
          onClick={onClick}
          title={title}
          disabled={disabled}
        >
          <MdiIcon path={iconPath} size={16} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{title}</TooltipContent>
    </Tooltip>
  );
}
