import { Link } from '@/components/link';
import { PageHero } from '@/components/page-hero';
import { buttonVariants } from '@/components/ui/button';
import { githubTreeHref } from '@/content/links';

const docsSourceLinks: readonly { href: string; label: string }[] = [
  { href: `${githubTreeHref}/docs`, label: 'All docs' },
  { href: `${githubTreeHref}/docs/plugin-api`, label: 'Plugin API docs' },
];

export function DocsHeader(): React.ReactElement {
  return (
    <PageHero
      actions={
        <>
          {docsSourceLinks.map((link, index) => (
            <Link
              className={index === 0 ? buttonVariants() : `${buttonVariants({ variant: 'outline' })} border-white/20 bg-white/5 text-white hover:bg-white/10`}
              href={link.href}
              icon="github"
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </>
      }
      darkImageSrc="/media/ocean-docs-hero.jpg"
      description="Source-backed guides for the extension, Core CLI, interactions, settings, built-in Plugins, and the Plugin API. Every topic leads to maintained Markdown in the repository."
      imageAlt=""
      imagePosition="50% center"
      imageSrc="/media/ocean-docs-hero-v3.jpg"
      size="compact"
      title="Docs"
    />
  );
}
