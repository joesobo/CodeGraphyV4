'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Link } from '@/components/link';
import { MobileNav } from '@/components/nav/mobile-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { buttonVariants } from '@/components/ui/button';
import { siteNavigation } from '@/content/navigation';
import { cn, isRouteActive } from '@/lib/utils';

const navbarItemClassName = 'flex min-h-10 items-center rounded-full px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8c7ff]';

export function Navbar(): React.ReactElement {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateScrolled = (): void => setScrolled(window.scrollY > 16);
    updateScrolled();
    window.addEventListener('scroll', updateScrolled, { passive: true });
    return () => window.removeEventListener('scroll', updateScrolled);
  }, []);

  return (
    <nav
      aria-label="Primary navigation"
      className={cn('navbar flex flex-nowrap items-center justify-between gap-4', scrolled && 'is-scrolled')}
    >
      <Link
        aria-label="CodeGraphy home"
        className="flex min-h-11 shrink-0 items-center gap-2.5 text-white transition-opacity hover:opacity-80"
        href={siteNavigation.home.href}
      >
        <span aria-hidden="true" className="codegraphy-symbol text-[1.8rem] text-[#a8c7ff]" />
        <span className="text-base font-semibold tracking-[-0.02em]">CodeGraphy</span>
      </Link>

      <ul className="hidden items-center gap-1 lg:flex">
        {siteNavigation.primary.map((item) => {
          const active = isRouteActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                aria-current={active ? 'page' : undefined}
                className={cn(navbarItemClassName, active && 'bg-white/10 text-white')}
                href={item.href}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <Link
          className={cn(
            buttonVariants({ size: 'sm', variant: 'ghost' }),
            'hidden border border-white/22 px-4 text-white/92 hover:bg-white/8 hover:text-white sm:inline-flex',
          )}
          href={siteNavigation.github.href}
          icon="github"
        >
          {siteNavigation.github.label}
        </Link>
        <Link
          className={cn(buttonVariants({ size: 'sm' }), 'install-cta hidden px-4 sm:inline-flex')}
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
