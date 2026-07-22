import { Link } from '@/components/link';
import { PageHero } from '@/components/page-hero';
import { buttonVariants } from '@/components/ui/button';
import { githubTreeHref } from '@/content/links';

export function ExamplesHeader(): React.ReactElement {
  return (
    <PageHero
      actions={
        <Link className={buttonVariants()} href={`${githubTreeHref}/examples`} icon="github">
          Browse example workspaces
        </Link>
      }
      aside={<><span className="font-mono text-[#61d8ca]">Real source. Real graphs.</span><br />Each example is intentionally compact enough to understand while still exercising meaningful relationships.</>}
      description="Small, runnable CodeGraphy Workspaces that make language and Plugin coverage concrete. Open one, run Indexing, and inspect the Nodes, Edges, and symbols it produces."
      eyebrow="See what CodeGraphy sees"
      imageAlt=""
      imagePosition="50% 56%"
      imageSrc="/media/ocean-examples-hero-v3.jpg"
      title="Examples"
    />
  );
}
