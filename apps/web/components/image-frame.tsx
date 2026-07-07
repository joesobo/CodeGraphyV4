import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function ImageFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <figure
      className={cn(
        'overflow-hidden rounded-xl bg-card shadow-sm',
        className,
      )}
    >
      {children}
    </figure>
  );
}
