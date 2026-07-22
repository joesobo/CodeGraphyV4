import type { ComponentType } from 'react';
import { NavLink, type NavItemLinkProps } from '@/components/nav/nav-link';
import type { NavGroup } from '@/content/navigation';

/** A plain group of navigation links with an optional label. */
export function NavSection({
  group,
  activeHref,
  onNavigate,
  itemLink: ItemLink = NavLink,
}: {
  group: NavGroup;
  activeHref?: string;
  onNavigate?: (href: string) => void;
  itemLink?: ComponentType<NavItemLinkProps>;
}): React.ReactElement {
  return (
    <div className="grid gap-0.5 py-0.5">
      {group.title ? (
        <p className="px-2 pt-1 pb-0.5 text-xs font-semibold text-muted-foreground">{group.title}</p>
      ) : null}
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
    </div>
  );
}
