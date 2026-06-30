const sitePageHeaderClassNames = {
  root: 'mx-auto flex w-full max-w-6xl flex-col gap-6 py-12 sm:py-16',
  eyebrow: 'text-sm font-semibold text-primary',
  heading: 'text-balance text-4xl font-semibold leading-tight sm:text-5xl',
  body: 'max-w-2xl text-lg leading-8 text-muted-foreground',
} as const;

interface SitePageHeaderProps {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}

export function SitePageHeader({
  children,
  eyebrow,
  title,
}: SitePageHeaderProps): React.ReactElement {
  return (
    <main className={sitePageHeaderClassNames.root}>
      <p className={sitePageHeaderClassNames.eyebrow}>{eyebrow}</p>
      <h1 className={sitePageHeaderClassNames.heading}>{title}</h1>
      <p className={sitePageHeaderClassNames.body}>{children}</p>
    </main>
  );
}
