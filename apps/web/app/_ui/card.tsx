import * as React from 'react';
import { cn } from './cn';

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn('rounded-md border border-border bg-card text-card-foreground shadow-sm', className)}
      {...props}
    />
  );
}
