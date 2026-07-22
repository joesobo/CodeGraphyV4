import { Link } from '@/components/link';
import { PageHero } from '@/components/page-hero';
import { buttonVariants } from '@/components/ui/button';
import { docsHref, examplesHref, homeHref } from '@/content/links';

export default function NotFound(): React.ReactElement {
  return (
    <PageHero
      eyebrow="404 · Off the map"
      title="Nothing surfaced here."
      description="This route is outside the current graph. Return home, read the docs, or open a runnable example workspace."
      aside={<><span className="font-mono text-[#61d8ca]">No orphan nodes found.</span><br />The page may have moved, or the address may be incomplete.</>}
      actions={
        <>
          <Link className={buttonVariants()} href={homeHref}>Return home</Link>
          <Link className={`${buttonVariants({ variant: 'outline' })} border-white/20 bg-white/5 text-white hover:bg-white/10`} href={docsHref}>Read the docs</Link>
          <Link className={`${buttonVariants({ variant: 'ghost' })} text-white/75 hover:bg-white/8 hover:text-white`} href={examplesHref}>Browse examples</Link>
        </>
      }
    />
  );
}
