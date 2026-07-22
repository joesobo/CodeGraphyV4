import NextLink from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Icon } from '@/components/icon';
import { cn } from '@/lib/utils';

export type LinkIcon = 'github' | 'vscode';

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'href'> {
  href: string;
  children?: ReactNode;
  icon?: LinkIcon;
  variant?: 'text';
}

const linkIconSrc: Record<LinkIcon, string> = {
  github: '/icons/github.svg',
  vscode: '/icons/vscode.svg',
};

export function Link({
  children,
  className,
  href,
  icon,
  rel,
  target,
  variant,
  ...anchorProps
}: LinkProps): React.ReactElement {
  const external = /^[a-z][a-z0-9+.-]*:/i.test(href);
  const opensInNewTab = href.startsWith('http://') || href.startsWith('https://');
  const classNames = cn(
    variant === 'text' && 'inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-foreground transition-colors hover:text-primary',
    className,
  );

  if (external) {
    return (
      <a
        {...anchorProps}
        className={classNames}
        href={href}
        rel={rel ?? (opensInNewTab ? 'noreferrer' : undefined)}
        target={target ?? (opensInNewTab ? '_blank' : undefined)}
      >
        {icon ? <Icon className="size-4 shrink-0" src={linkIconSrc[icon]} variant="mono" /> : null}
        {children}
      </a>
    );
  }

  return (
    <NextLink {...anchorProps} className={classNames} href={href} rel={rel} target={target}>
      {icon ? <Icon className="size-4 shrink-0" src={linkIconSrc[icon]} variant="mono" /> : null}
      {children}
    </NextLink>
  );
}
