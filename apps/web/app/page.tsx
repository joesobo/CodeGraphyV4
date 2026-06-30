import { GitBranch, MonitorDown } from 'lucide-react';
import { SiteLink } from '@/components/site/link';
import { siteLinks } from '@/components/site/site-links';
import { Button } from '@/components/ui/button';

const homePageClassNames = {
  main: 'mx-auto flex w-full max-w-6xl flex-col gap-8 py-12 sm:py-16',
  heroCopy: 'max-w-3xl',
  eyebrow: 'mb-3 text-sm font-semibold text-primary',
  headline: 'text-balance text-5xl font-semibold leading-none sm:text-7xl',
  body: 'mt-6 max-w-2xl text-lg leading-8 text-muted-foreground',
  actions: 'mt-8 flex flex-col gap-3 sm:flex-row',
} as const;

function HomePageActions(): React.ReactElement {
  return (
    <div className={homePageClassNames.actions}>
      <Button asChild size="lg">
        <SiteLink href={siteLinks.marketplace}>
          <MonitorDown aria-hidden="true" />
          Install CodeGraphy
        </SiteLink>
      </Button>
      <Button asChild size="lg" variant="outline">
        <SiteLink href={siteLinks.github}>
          <GitBranch aria-hidden="true" />
          View source
        </SiteLink>
      </Button>
    </div>
  );
}

export default function HomePage(): React.ReactElement {
  return (
    <main className={homePageClassNames.main}>
      <div className={homePageClassNames.heroCopy}>
        <p className={homePageClassNames.eyebrow}>Website refresh scaffold</p>
        <h1 className={homePageClassNames.headline}>See how your workspace connects.</h1>
        <p className={homePageClassNames.body}>
          This first checkpoint proves the Next.js app, shadcn-style local UI primitives,
          testing, linting, typechecking, and monorepo build wiring are all working before we
          design the real CodeGraphy home page.
        </p>
        <HomePageActions />
      </div>
    </main>
  );
}
