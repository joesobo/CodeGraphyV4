import { Link } from '@/components/link';
import { PageHero } from '@/components/page-hero';
import { buttonVariants } from '@/components/ui/button';
import { githubTreeHref } from '@/content/links';

export function ExamplesHeader(): React.ReactElement {
  return (
    <PageHero
      eyebrow="See what CodeGraphy sees"
      title="Examples"
      description="Small, runnable CodeGraphy Workspaces that make language and Plugin coverage concrete. Open one, run Indexing, and inspect the Nodes, Edges, and symbols it produces."
      aside={<><span className="font-mono text-[#61d8ca]">Real source. Real graphs.</span><br />Each example is intentionally compact enough to understand while still exercising meaningful relationships.</>}
      actions={
        <Link className={buttonVariants()} href={`${githubTreeHref}/examples`} icon="github">
          Browse example workspaces
        </Link>
      }
    />
  );
}
