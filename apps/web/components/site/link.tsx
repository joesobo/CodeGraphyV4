import Link from 'next/link';
import { forwardRef } from 'react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

interface SiteLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  children: ReactNode;
  href: string;
}

function isExternalHref(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://');
}

export const SiteLink = forwardRef<HTMLAnchorElement, SiteLinkProps>(function SiteLink(
  { children, href, rel, target, ...anchorProps },
  ref,
): React.ReactElement {
  if (isExternalHref(href)) {
    return (
      <a
        href={href}
        ref={ref}
        rel={rel ?? 'noreferrer'}
        target={target ?? '_blank'}
        {...anchorProps}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} ref={ref} {...anchorProps}>
      {children}
    </Link>
  );
});
