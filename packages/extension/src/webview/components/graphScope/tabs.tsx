import React from 'react';
import { Button } from '../ui/button';

export type GraphScopeTab = 'nodes' | 'edges';

interface ScopeTabButtonProps {
  active: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}

export function ScopeTabButton({
  active,
  children,
  disabled = false,
  onClick,
}: ScopeTabButtonProps): React.ReactElement {
  return (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      size="sm"
      aria-pressed={active}
      className="h-7 flex-1 px-2 text-xs"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
