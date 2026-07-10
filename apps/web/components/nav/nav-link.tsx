'use client';

import { KeyboardArrowDown } from '@material-symbols-svg/react/rounded';
import type { ReactNode } from 'react';
import { useRef } from 'react';
import { Icon } from '@/components/icon';
import { Link } from '@/components/link';
import { CollapsibleTrigger } from '@/components/ui/collapsible';
import { NavigationMenuLink } from '@/components/ui/navigation-menu';
import type { NavItem } from '@/content/navigation';
import { useScrollActiveNavItemIntoView } from '@/hooks/use-scroll-active-nav-item-into-view';
import { cn } from '@/lib/utils';

type NavDensity = 'default' | 'compact';

export interface NavItemLinkProps {
  item: NavItem;
  active?: boolean;
  density?: NavDensity;
  onNavigate?: (href: string) => void;
}

const navRowClassName = cn(
  'flex min-h-9 w-full min-w-0 flex-row items-center gap-2 rounded-md',
  'cursor-pointer px-2 py-1.5 text-left text-sm font-semibold text-foreground',
  'transition-colors hover:bg-secondary',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);
const compactNavRowClassName = 'min-h-8 py-1';

/** A navigation link, used by the page sidebar and the mobile menu. */
export function NavLink({
  item,
  active = false,
  density = 'default',
  onNavigate,
}: NavItemLinkProps): React.ReactElement {
  const itemRef = useRef<HTMLLIElement>(null);
  useScrollActiveNavItemIntoView(itemRef, active);

  return (
    <li className="min-w-0" ref={itemRef}>
      <Link
        aria-current={active ? (item.href.includes('#') ? 'location' : 'page') : undefined}
        className={cn(
          navRowClassName,
          density === 'compact' && compactNavRowClassName,
          active && 'bg-secondary',
        )}
        href={item.href}
        onClick={() => onNavigate?.(item.href)}
      >
        {item.iconUrl ? <Icon className="size-4.5 shrink-0" src={item.iconUrl} /> : null}
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </Link>
    </li>
  );
}

/** A navigation-menu link, used inside desktop dropdown popups. */
export function NavMenuLink({
  item,
  active = false,
  density = 'compact',
  onNavigate,
}: NavItemLinkProps): React.ReactElement {
  return (
    <li className="min-w-0">
      <NavigationMenuLink
        className={cn(
          navRowClassName,
          density === 'compact' && compactNavRowClassName,
          active && 'bg-secondary',
        )}
        render={<Link href={item.href} onClick={() => onNavigate?.(item.href)} />}
      >
        {item.iconUrl ? <Icon className="size-4.5 shrink-0" src={item.iconUrl} /> : null}
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </NavigationMenuLink>
    </li>
  );
}

/** A collapsible navigation trigger, used for grouped nav sections. */
export function NavDisclosureTrigger({
  children,
  active = false,
  density = 'default',
}: {
  children: ReactNode;
  active?: boolean;
  density?: NavDensity;
}): React.ReactElement {
  return (
    <CollapsibleTrigger
      className={cn(
        navRowClassName,
        'group justify-between',
        density === 'compact' && compactNavRowClassName,
        active && 'bg-secondary',
      )}
    >
      <span className="truncate">{children}</span>
      <KeyboardArrowDown
        aria-hidden="true"
        className="size-4 shrink-0 transition-transform group-data-panel-open:rotate-180"
      />
    </CollapsibleTrigger>
  );
}
