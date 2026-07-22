'use client';

import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import { Close as CloseIcon } from '@material-symbols-svg/react/rounded';
import type { ComponentProps, ReactElement } from 'react';
import { cn } from '@/lib/utils';

function Sheet(props: ComponentProps<typeof SheetPrimitive.Root>): ReactElement {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: ComponentProps<typeof SheetPrimitive.Trigger>): ReactElement {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: ComponentProps<typeof SheetPrimitive.Close>): ReactElement {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Backdrop>): ReactElement {
  return (
    <SheetPrimitive.Backdrop
      className={cn(
        'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-opacity duration-200 data-ending-style:duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0',
        className,
      )}
      data-slot="sheet-overlay"
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: ComponentProps<typeof SheetPrimitive.Popup> & {
  side?: 'top' | 'right' | 'bottom' | 'left';
  showCloseButton?: boolean;
}): ReactElement {
  return (
    <SheetPrimitive.Portal data-slot="sheet-portal">
      <SheetOverlay />
      <SheetPrimitive.Popup
        className={cn(
          'fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition-transform duration-[240ms] ease-[cubic-bezier(0.23,1,0.32,1)] data-ending-style:duration-150',
          side === 'right' &&
            'inset-y-0 right-0 h-full w-3/4 border data-ending-style:translate-x-full data-starting-style:translate-x-full sm:max-w-sm',
          side === 'left' &&
            'inset-y-0 left-0 h-full w-3/4 border data-ending-style:-translate-x-full data-starting-style:-translate-x-full sm:max-w-sm',
          side === 'top' &&
            'inset-x-0 top-0 h-auto border-b data-ending-style:-translate-y-full data-starting-style:-translate-y-full',
          side === 'bottom' &&
            'inset-x-0 bottom-0 h-auto border-t data-ending-style:translate-y-full data-starting-style:translate-y-full',
          className,
        )}
        data-slot="sheet-content"
        {...props}
      >
        {children}
        {showCloseButton ? (
          <SheetPrimitive.Close className="absolute top-2.5 right-2.5 grid size-11 place-items-center rounded-full opacity-70 ring-offset-background transition-opacity hover:bg-secondary hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <CloseIcon aria-hidden="true" className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: ComponentProps<'div'>): ReactElement {
  return (
    <div className={cn('flex flex-col gap-1.5 p-4', className)} data-slot="sheet-header" {...props} />
  );
}

function SheetFooter({ className, ...props }: ComponentProps<'div'>): ReactElement {
  return (
    <div
      className={cn('mt-auto flex flex-col gap-2 p-4', className)}
      data-slot="sheet-footer"
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Title>): ReactElement {
  return (
    <SheetPrimitive.Title
      className={cn('font-semibold text-foreground', className)}
      data-slot="sheet-title"
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Description>): ReactElement {
  return (
    <SheetPrimitive.Description
      className={cn('text-sm text-muted-foreground', className)}
      data-slot="sheet-description"
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
