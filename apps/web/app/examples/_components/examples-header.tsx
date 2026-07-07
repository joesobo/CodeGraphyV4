import { AccountTree } from '@material-symbols-svg/react/rounded';
import { ImageFrame } from '@/components/image-frame';
import { Link } from '@/components/link';
import { MediaImage } from '@/components/media-image';
import { PageHeader, PageHeaderActions } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { githubTreeHref } from '@/content/links';

export function ExamplesHeader(): React.ReactElement {
  return (
    <header className="grid gap-8 lg:grid-cols-[0.85fr_1fr] lg:items-start">
      <div>
        <PageHeader
          title="Examples"
          description="Every example is a small, runnable workspace that exercises a language or plugin. Open one to see exactly which nodes, edges, and symbols CodeGraphy produces — or browse them all in the repo."
        />
        <PageHeaderActions>
          <Link className={buttonVariants()} href={`${githubTreeHref}/examples`}>
            <AccountTree aria-hidden="true" />
            Example workspaces
          </Link>
        </PageHeaderActions>
      </div>
      <ImageFrame>
        <MediaImage
          className="w-full"
          imageClassName="h-auto w-full"
          media={{
            alt: 'CodeGraphy graph of the examples root workspace',
            src: '/media/examples-root-graph.png',
          }}
          height={1213}
          width={1264}
        />
      </ImageFrame>
    </header>
  );
}
