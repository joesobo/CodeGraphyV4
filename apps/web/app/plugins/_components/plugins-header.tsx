import { Link } from '@/components/link';
import { PageHero } from '@/components/page-hero';
import { buttonVariants } from '@/components/ui/button';
import { docsHref, githubHref } from '@/content/links';

export function PluginsHeader(): React.ReactElement {
  return (
    <PageHero
      actions={
        <>
          <Link className={buttonVariants()} href={githubHref} icon="github">
            Source
          </Link>
          <Link
            className={`${buttonVariants({ variant: 'outline' })} border-white/20 bg-white/5 text-white hover:bg-white/10`}
            href={`${docsHref}#plugin-api`}
          >
            Plugin API
          </Link>
        </>
      }
      aside={<><span className="font-mono text-[#a8c7ff]">Plugin API v3</span><br />Typed contracts, validated metadata, workspace-local enablement, and Core-owned lifecycle hooks.</>}
      description="Headless npm packages that teach the Core Package new language, framework, engine, document, and visual semantics. The extension renders the Relationship Graph they help build."
      eyebrow="Extend the graph"
      imageAlt=""
      imagePosition="58% center"
      imageSrc="/media/ocean-plugins-hero-v3.jpg"
      title="Plugins"
    />
  );
}
