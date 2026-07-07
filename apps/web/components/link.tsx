import { OpenInNew } from '@material-symbols-svg/react/rounded';
import NextLink from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'href'> {
  href: string;
  /** Optional so the element can be passed to a Base UI `render` prop, which injects children. */
  children?: ReactNode;
  variant?: 'text';
}

export function Link({
  children,
  className,
  href,
  rel,
  target,
  variant,
  ...anchorProps
}: LinkProps): React.ReactElement {
  const external = /^[a-z][a-z0-9+.-]*:/i.test(href);
  const opensInNewTab = href.startsWith('http://') || href.startsWith('https://');
  const classNames = cn(variant === 'text' && 'inline-flex items-center gap-1 text-sm font-semibold text-foreground transition-colors hover:text-primary', className);

  if (external) {
    return (
      <a
        {...anchorProps}
        className={classNames}
        href={href}
        rel={rel ?? (opensInNewTab ? 'noreferrer' : undefined)}
        target={target ?? (opensInNewTab ? '_blank' : undefined)}
      >
        {children}
        {variant === 'text' ? <OpenInNew aria-hidden="true" className="size-3.5" /> : null}
      </a>
    );
  }

  return (
    <NextLink {...anchorProps} className={classNames} href={href} rel={rel} target={target}>
      {children}
    </NextLink>
  );
}
