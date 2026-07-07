import * as React from 'react';
import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-secondary', className)}
      data-slot="skeleton"
      {...props}
    />
  );
}

export { Skeleton };
