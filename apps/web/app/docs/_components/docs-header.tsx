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
      aside={<><span className="font-mono text-[#a8c7ff]">One source of truth.</span><br />The site points to the same docs the project maintains alongside its code.</>}
      description="Source-backed guides for the extension, Core CLI, interactions, settings, built-in Plugins, and the Plugin API. Every topic leads to maintained Markdown in the repository."
      eyebrow="Documentation"
      imageAlt=""
      imagePosition="50% center"
      imageSrc="/media/ocean-docs-hero-v3.jpg"
      size="compact"
      title="Docs"
    />
  );
}
