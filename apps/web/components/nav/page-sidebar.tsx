'use client';

import { useMemo } from 'react';
import { NavGroupView } from '@/components/nav/nav-group-view';
import { Sidebar, SidebarContent } from '@/components/ui/sidebar';
import type { NavGroup } from '@/content/navigation';
import { useScrollSpy } from '@/hooks/use-scroll-spy';

export function PageSidebar({ nav }: { nav: readonly NavGroup[] }): React.ReactElement {
  const sectionHrefs = useMemo(() => getSectionHrefs(nav), [nav]);
  const { activeHref, setActiveFromNavigation } = useScrollSpy(sectionHrefs);

  return (
    <Sidebar aria-label="On this page" className="border-0 border-l border-border bg-transparent shadow-none backdrop-blur-none">
      <p className="px-4 pt-1 pb-3 text-sm font-medium text-muted-foreground">
        On this page
      </p>
      <SidebarContent>
        <NavGroupView
          activeHref={activeHref}
          groups={nav}
          onNavigate={setActiveFromNavigation}
        />
      </SidebarContent>
    </Sidebar>
  );
}

function getSectionHrefs(groups: readonly NavGroup[]): readonly string[] {
  const hrefs = groups.flatMap((group) => group.items.map((item) => item.href));
  return Array.from(new Set(hrefs));
}
