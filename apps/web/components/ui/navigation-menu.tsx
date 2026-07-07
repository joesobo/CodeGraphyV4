'use client';

import { NavigationMenu as NavigationMenuPrimitive } from '@base-ui/react/navigation-menu';
import { KeyboardArrowDown } from '@material-symbols-svg/react/rounded';
import { cva } from 'class-variance-authority';
import type { ComponentProps, ReactElement } from 'react';
import { cn } from '@/lib/utils';

function NavigationMenu({
  className,
  children,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive.Root>): ReactElement {
  return (
    <NavigationMenuPrimitive.Root
      className={cn(
        'group/navigation-menu relative flex max-w-max flex-1 items-center justify-center',
        className,
      )}
      data-slot="navigation-menu"
      {...props}
    >
      {children}
      <NavigationMenuViewport />
    </NavigationMenuPrimitive.Root>
  );
}

function NavigationMenuList({
  className,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive.List>): ReactElement {
  return (
    <NavigationMenuPrimitive.List
      className={cn('group flex flex-1 list-none items-center justify-center gap-1', className)}
      data-slot="navigation-menu-list"
      {...props}
    />
  );
}

function NavigationMenuItem({
  className,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive.Item>): ReactElement {
  return (
    <NavigationMenuPrimitive.Item
      className={cn('relative', className)}
      data-slot="navigation-menu-item"
      {...props}
    />
  );
}

const navigationMenuTriggerStyle = cva(
  'group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-[color,box-shadow] outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-popup-open:bg-accent/50 data-popup-open:text-accent-foreground data-popup-open:hover:bg-accent data-popup-open:focus:bg-accent',
);

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive.Trigger>): ReactElement {
  return (
    <NavigationMenuPrimitive.Trigger
      className={cn(navigationMenuTriggerStyle(), 'group', className)}
      data-slot="navigation-menu-trigger"
      {...props}
    >
      {children}{' '}
      <NavigationMenuPrimitive.Icon
        render={
          <KeyboardArrowDown className="relative top-[1px] ml-1 size-3 transition duration-300 group-data-popup-open:rotate-180" />
        }
      />
    </NavigationMenuPrimitive.Trigger>
  );
}

function NavigationMenuContent({
  className,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive.Content>): ReactElement {
  return (
    <NavigationMenuPrimitive.Content
      className={cn(
        'w-full p-2 pr-2.5 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 md:w-auto',
        className,
      )}
      data-slot="navigation-menu-content"
      {...props}
    />
  );
}

function NavigationMenuViewport({
  className,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive.Viewport>): ReactElement {
  return (
    <NavigationMenuPrimitive.Portal>
      <NavigationMenuPrimitive.Positioner
        className="isolate z-50"
        collisionPadding={12}
        sideOffset={6}
      >
        <NavigationMenuPrimitive.Popup
          className={cn(
            'h-[var(--popup-height)] w-full origin-[var(--transform-origin)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow transition-[opacity,width,height] duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 md:w-[var(--popup-width)]',
          )}
        >
          <NavigationMenuPrimitive.Viewport
            className={cn('relative h-full w-full overflow-hidden', className)}
            data-slot="navigation-menu-viewport"
            {...props}
          />
        </NavigationMenuPrimitive.Popup>
      </NavigationMenuPrimitive.Positioner>
    </NavigationMenuPrimitive.Portal>
  );
}

function NavigationMenuLink({
  className,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive.Link>): ReactElement {
  return (
    <NavigationMenuPrimitive.Link
      className={cn(
        "flex flex-col gap-1 rounded-sm p-2 text-sm transition-all outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 data-active:bg-accent/50 data-active:text-accent-foreground data-active:hover:bg-accent data-active:focus:bg-accent [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className,
      )}
      closeOnClick
      data-slot="navigation-menu-link"
      {...props}
    />
  );
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
};
