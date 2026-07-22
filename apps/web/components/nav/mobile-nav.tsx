'use client';

import { Menu } from '@material-symbols-svg/react/rounded';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Link } from '@/components/link';
import { NavGroupView } from '@/components/nav/nav-group-view';
import { NavDisclosureTrigger, NavLink } from '@/components/nav/nav-link';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { siteNavigation, type NavItem } from '@/content/navigation';
import { cn, isRouteActive } from '@/lib/utils';

/**
 * The single mobile menu (< lg). It shows the site nav up top, expands the
 * current section in place, then keeps the GitHub and Install actions pinned
 * at the bottom.
 */
export function MobileNav(): React.ReactElement {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeMenu = (): void => setOpen(false);

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger
        render={
          <Button
            aria-label="Open menu"
            className="size-11 rounded-full p-0 text-white hover:bg-white/8 lg:hidden"
            size="sm"
            variant="ghost"
          />
        }
      >
        <Menu aria-hidden="true" className="size-5" />
      </SheetTrigger>

      <SheetContent
        className="w-[min(20rem,100vw)] gap-0 border-l-white/10 bg-[#071722] p-0 text-white [--foreground:#fff] [--muted-foreground:rgb(255_255_255_/_0.76)] [--secondary:rgb(255_255_255_/_0.1)] [&_[data-slot=sheet-close]]:text-white"
        side="right"
      >
        <SheetHeader className="border-b border-white/10">
          <SheetTitle className="text-white">Menu</SheetTitle>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <nav aria-label="Site" className="mobile-navigation grid gap-0.5">
            <ul className="grid gap-0.5">
              <NavLink
                active={pathname === siteNavigation.home.href}
                item={siteNavigation.home}
                onNavigate={closeMenu}
              />
            </ul>
            {siteNavigation.primary.map((item) => (
              <MobileNavItem
                item={item}
                key={item.href}
                onNavigate={closeMenu}
                pathname={pathname}
              />
            ))}
          </nav>
        </div>

        <div className="grid gap-2 border-t border-white/10 p-3">
          <Link
            className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
            href={siteNavigation.github.href}
            icon="github"
            onClick={closeMenu}
          >
            {siteNavigation.github.label}
          </Link>
          <Link
            className={cn(buttonVariants(), 'w-full')}
            href={siteNavigation.install.href}
            icon="vscode"
            onClick={closeMenu}
          >
            {siteNavigation.install.label}
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MobileNavItem({
  item,
  onNavigate,
  pathname,
}: {
  item: NavItem;
  onNavigate: () => void;
  pathname: string;
}): React.ReactElement {
  const active = isRouteActive(pathname, item.href);
  const [open, setOpen] = useState(active);

  useEffect(() => {
    if (active) {
      setOpen(true);
    }
  }, [active]);

  if (!item.nav) {
    return (
      <ul className="grid gap-0.5">
        <NavLink active={active} item={item} onNavigate={onNavigate} />
      </ul>
    );
  }

  return (
    <Collapsible className="py-0.5" onOpenChange={setOpen} open={open}>
      <NavDisclosureTrigger active={active}>{item.label}</NavDisclosureTrigger>
      <CollapsibleContent className="pt-0.5 pl-2">
        <NavGroupView groups={item.nav} onNavigate={onNavigate} />
      </CollapsibleContent>
    </Collapsible>
  );
}
