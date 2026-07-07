'use client';

import { useMemo } from 'react';
import { NavDropdown } from '@/components/nav/nav-dropdown';
import { NavSection } from '@/components/nav/nav-section';
import { Sidebar, SidebarContent } from '@/components/ui/sidebar';
import type { NavGroup } from '@/content/navigation';
import { useScrollSpy } from '@/hooks/use-scroll-spy';

export function PageSidebar({ nav }: { nav: readonly NavGroup[] }): React.ReactElement {
  const sectionHrefs = useMemo(() => getSectionHrefs(nav), [nav]);
  const [activeHref, setActiveHref] = useScrollSpy(sectionHrefs);

  return (
    <Sidebar aria-label="On this page">
      <SidebarContent>
        {nav.map((group, index) => {
          const Group = group.collapsible ? NavDropdown : NavSection;

          return (
            <Group
              activeHref={activeHref}
              group={group}
              key={group.title ?? index}
              onNavigate={setActiveHref}
            />
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}

function getSectionHrefs(groups: readonly NavGroup[]): readonly string[] {
  const hrefs = groups.flatMap((group) => group.items.map((item) => item.href));
  return Array.from(new Set(hrefs));
}
