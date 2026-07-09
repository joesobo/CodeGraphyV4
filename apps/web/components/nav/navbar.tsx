'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Link } from '@/components/link';
import { MobileNav } from '@/components/nav/mobile-nav';
import { NavDisclosureTrigger, NavMenuLink } from '@/components/nav/nav-link';
import { ThemeToggle } from '@/components/theme-toggle';
import { buttonVariants } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { siteNavigation, type NavGroup, type NavItem } from '@/content/navigation';
import { cn, isRouteActive } from '@/lib/utils';

const navbarItemClassName =
  'inline-flex h-9 cursor-pointer items-center justify-center gap-1 rounded-full bg-transparent px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-secondary';
const activeNavbarItemClassName = 'bg-secondary text-foreground';
const navbarActionClassName = 'h-9 rounded-full px-4 text-sm font-semibold';

export function Navbar(): React.ReactElement {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary navigation"
      className="flex flex-nowrap items-center justify-between gap-4"
    >
      <Link
        aria-label="CodeGraphy home"
        className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-75"
        href={siteNavigation.home.href}
      >
        <span aria-hidden="true" className="codegraphy-symbol text-[1.75rem]" />
        <span className="text-base font-semibold">CodeGraphy</span>
      </Link>

      <NavigationMenu className="hidden lg:flex">
        <NavigationMenuList className="gap-1.5">
          {siteNavigation.primary.map((item) => (
            <NavbarPrimaryItem item={item} key={item.href} pathname={pathname} />
          ))}
        </NavigationMenuList>
      </NavigationMenu>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <Link
          className={cn(
            buttonVariants({ size: 'sm', variant: 'ghost' }),
            navbarActionClassName,
            'hidden border border-border/80 text-foreground hover:border-primary/40 sm:inline-flex',
          )}
          href={siteNavigation.github.href}
          icon="github"
        >
          {siteNavigation.github.label}
        </Link>
        <Link
          className={cn(buttonVariants({ size: 'sm' }), navbarActionClassName, 'hidden sm:inline-flex')}
          href={siteNavigation.install.href}
          icon="vscode"
        >
          {siteNavigation.install.label}
        </Link>

        <MobileNav />
      </div>
    </nav>
  );
}

function NavbarPrimaryItem({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}): React.ReactElement {
  const active = isRouteActive(pathname, item.href);

  if (!item.nav) {
    return (
      <NavigationMenuItem>
        <NavigationMenuLink
          active={active}
          className={cn(navbarItemClassName, active && activeNavbarItemClassName)}
          render={<Link href={item.href} />}
        >
          {item.label}
        </NavigationMenuLink>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger
        aria-current={active ? 'page' : undefined}
        className={cn(navbarItemClassName, active && activeNavbarItemClassName)}
        nativeButton={false}
        render={<Link href={item.href} />}
      >
        {item.label}
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="w-72">
          <div className="grid max-h-[min(24rem,calc(100vh-10rem))] gap-0.5 overflow-y-auto pr-1">
            {item.nav.map((group, index) =>
              group.collapsible ? (
                <NavbarDropdownGroup group={group} key={group.title ?? index} />
              ) : (
                <NavbarDropdownSection group={group} key={group.title ?? index} />
              ),
            )}
          </div>
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

function NavbarDropdownGroup({ group }: { group: NavGroup }): React.ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible className="py-0.5" onOpenChange={setOpen} open={open}>
      <NavDisclosureTrigger density="compact">{group.title}</NavDisclosureTrigger>
      <CollapsibleContent className="pt-0.5 pl-2">
        <ul className="grid gap-0.5">
          {group.items.map((item) => (
            <NavMenuLink item={item} key={item.href} />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function NavbarDropdownSection({ group }: { group: NavGroup }): React.ReactElement {
  return (
    <div className="grid gap-0.5 py-0.5">
      {group.title ? (
        <p className="px-2 pt-1 pb-0.5 text-xs font-semibold text-muted-foreground">{group.title}</p>
      ) : null}
      <ul className="grid gap-0.5">
        {group.items.map((item) => (
          <NavMenuLink item={item} key={item.href} />
        ))}
      </ul>
    </div>
  );
}
