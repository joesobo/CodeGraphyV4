import { Link } from '@/components/link';
import { PageHero } from '@/components/page-hero';
import { buttonVariants } from '@/components/ui/button';
import { docsHref, homeHref } from '@/content/links';

export default function NotFound(): React.ReactElement {
  return (
    <PageHero
      actions={
        <>
          <Link className={buttonVariants()} href={homeHref}>Return home</Link>
          <Link className={`${buttonVariants({ variant: 'outline' })} border-white/20 bg-white/5 text-white hover:bg-white/10`} href={docsHref}>Read the docs</Link>
        </>
      }
      aside={<><span className="font-mono text-[#a8c7ff]">No node at this address.</span><br />The page may have moved, or the path may be incomplete.</>}
      description="CodeGraphy could not resolve this route. Return to the home graph or open the docs."
      eyebrow="404 · Off the map"
      imageAlt=""
      imagePosition="48% center"
      imageSrc="/media/ocean-not-found-hero-v3.jpg"
      size="tall"
      title="Nothing surfaced here."
      tone="minimal"
    />
  );
}
