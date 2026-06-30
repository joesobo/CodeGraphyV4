'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { SiteLink } from '@/components/site/link';
import { primaryNavigationLinks, siteLinks } from '@/components/site/site-links';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';

const navigationClassNames = {
  root: 'flex flex-wrap items-center justify-between gap-x-6 gap-y-3',
  brand: 'flex items-center gap-2 text-sm font-semibold text-foreground',
  icon: 'size-6',
  menu: 'order-3 w-full max-w-none flex-none justify-start sm:order-none sm:w-auto',
  menuList: 'justify-start gap-1',
  actions: 'flex items-center gap-3',
} as const;

export function SiteNavigation(): React.ReactElement {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className={navigationClassNames.root}>
      <SiteLink className={navigationClassNames.brand} href={siteLinks.home}>
        <Image
          src="/icon.svg"
          alt=""
          aria-hidden
          className={navigationClassNames.icon}
          height={24}
          width={24}
        />
        <span>CodeGraphy</span>
      </SiteLink>

      <NavigationMenu className={navigationClassNames.menu} viewport={false}>
        <NavigationMenuList className={navigationClassNames.menuList}>
          {primaryNavigationLinks.map(({ href, label }) => {
            const isActive = pathname === href;

            return (
              <NavigationMenuItem key={href}>
                <NavigationMenuLink
                  active={isActive}
                  asChild
                  className={navigationMenuTriggerStyle()}
                >
                  <SiteLink aria-current={isActive ? 'page' : undefined} href={href}>
                    {label}
                  </SiteLink>
                </NavigationMenuLink>
              </NavigationMenuItem>
            );
          })}
        </NavigationMenuList>
      </NavigationMenu>

      <div className={navigationClassNames.actions}>
        <Button asChild size="sm" variant="ghost">
          <SiteLink href={siteLinks.github}>GitHub</SiteLink>
        </Button>
        <Button asChild size="sm">
          <SiteLink href={siteLinks.marketplace}>Install</SiteLink>
        </Button>
      </div>
    </nav>
  );
}
