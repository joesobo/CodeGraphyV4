import type { HTMLAttributes, ReactElement } from 'react';
import { cn } from '@/lib/utils';

/**
 * A sticky desktop side rail. Below `lg` it is hidden — small screens reach the
 * same navigation through the combined menu in the navbar (see components/mobile-nav.tsx).
 */
export function Sidebar({
  className,
  ...props
}: HTMLAttributes<HTMLElement>): ReactElement {
  return (
    <aside
      className={cn(
        'hidden w-full shrink-0 overflow-hidden rounded-xl border border-border bg-card/95 shadow-sm backdrop-blur lg:sticky lg:top-[5.75rem] lg:flex lg:max-h-[calc(100vh-7rem)] lg:flex-col',
        className,
      )}
      {...props}
    />
  );
}

export function SidebarContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement {
  return (
    <div
      className={cn('grid min-h-0 flex-1 content-start gap-1 overflow-y-auto px-3 py-3', className)}
      data-sidebar-content=""
      {...props}
    />
  );
}
