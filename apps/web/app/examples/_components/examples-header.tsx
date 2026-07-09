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
          description="Every example is a small, runnable CodeGraphy Workspace that exercises a language or Plugin. Open one to see exactly which Nodes, Edges, and symbols CodeGraphy produces — or browse them all in the repo."
        />
        <PageHeaderActions>
          <Link className={buttonVariants()} href={`${githubTreeHref}/examples`} icon="github">
            Example workspaces
          </Link>
        </PageHeaderActions>
      </div>
      <ImageFrame>
        <MediaImage
          className="w-full dark:hidden"
          imageClassName="h-auto w-full"
          media={{
            alt: 'CodeGraphy Relationship Graph of the examples root workspace',
            src: '/media/examples-root-graph-light.png',
          }}
          height={1200}
          width={1200}
        />
        <MediaImage
          className="hidden w-full dark:block"
          imageClassName="h-auto w-full"
          media={{
            alt: 'CodeGraphy Relationship Graph of the examples root workspace',
            src: '/media/examples-root-graph-dark.png',
          }}
          height={1200}
          width={1200}
        />
      </ImageFrame>
    </header>
  );
}
