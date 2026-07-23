import type { ComponentType } from 'react';
import { NavDropdown } from '@/components/nav/nav-dropdown';
import type { NavItemLinkProps } from '@/components/nav/nav-link';
import { NavSection } from '@/components/nav/nav-section';
import type { NavGroup } from '@/content/navigation';

/** Renders navigation groups using their collapsible or plain presentation. */
export function NavGroupView({
  groups,
  activeHref,
  onNavigate,
  itemLink,
  initialOpen,
}: {
  groups: readonly NavGroup[];
  activeHref?: string;
  onNavigate?: (href: string) => void;
  itemLink?: ComponentType<NavItemLinkProps>;
  initialOpen?: boolean;
}): React.ReactElement {
  return (
    <>
      {groups.map((group) => {
        const groupKey = group.title ?? group.items.map((item) => item.href).join('|');

        return group.collapsible ? (
          <NavDropdown
            activeHref={activeHref}
            group={group}
            initialOpen={initialOpen}
            itemLink={itemLink}
            key={groupKey}
            onNavigate={onNavigate}
          />
        ) : (
          <NavSection
            activeHref={activeHref}
            group={group}
            itemLink={itemLink}
            key={groupKey}
            onNavigate={onNavigate}
          />
        );
      })}
    </>
  );
}
