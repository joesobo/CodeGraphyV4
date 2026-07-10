'use client';

import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import {
  NavDisclosureTrigger,
  NavLink,
  type NavItemLinkProps,
} from '@/components/nav/nav-link';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import type { NavGroup } from '@/content/navigation';

/**
 * A collapsible group of navigation links. Opens automatically when it
 * contains the active item.
 */
export function NavDropdown({
  group,
  activeHref,
  onNavigate,
  itemLink: ItemLink = NavLink,
  initialOpen = group.defaultOpen ?? false,
}: {
  group: NavGroup;
  activeHref?: string;
  onNavigate?: (href: string) => void;
  itemLink?: ComponentType<NavItemLinkProps>;
  initialOpen?: boolean;
}): React.ReactElement {
  const [open, setOpen] = useState(initialOpen);
  const hasActiveItem = group.items.some((item) => item.href === activeHref);

  useEffect(() => {
    if (hasActiveItem) {
      setOpen(true);
    }
  }, [hasActiveItem]);

  return (
    <Collapsible className="py-0.5" onOpenChange={setOpen} open={open}>
      <NavDisclosureTrigger density="compact">{group.title}</NavDisclosureTrigger>
      <CollapsibleContent className="pt-0.5 pl-2">
        <ul className="grid gap-0.5">
          {group.items.map((item) => (
            <ItemLink
              active={item.href === activeHref}
              density="compact"
              item={item}
              key={item.href}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
