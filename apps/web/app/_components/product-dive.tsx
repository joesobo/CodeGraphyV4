import type { Media } from '@/components/media-image';
import { Link } from '@/components/link';
import { MediaImage } from '@/components/media-image';
import { pluginsHref } from '@/content/links';
import { cn } from '@/lib/utils';

interface DiveChapter {
  description: string;
  detail: string;
  index: string;
  media: Media;
  mediaAspect?: 'square' | 'wide';
  supportingAction?: { href: string; label: string };
  title: string;
}

const chapters: readonly DiveChapter[] = [
  {
    index: '01',
    title: 'Map the whole workspace.',
    description:
      'Index files, folders, packages, and symbols into one local Relationship Graph. Start wide, then follow the connections that matter.',
    detail: 'One graph cache · local source · no upload',
    mediaAspect: 'square',
    media: {
      alt: 'Force-directed CodeGraphy Relationship Graph settling into workspace clusters',
      src: '/media/features/force-graph-light.gif',
      posterSrc: '/media/features/posters/force-graph-light.png',
      darkSrc: '/media/features/force-graph-dark.gif',
      darkPosterSrc: '/media/features/posters/force-graph-dark.png',
    },
  },
  {
    index: '02',
    title: 'Move through relationships.',
    description:
      'Pan, zoom, focus, and expand the graph as a living system. Physics reveals clusters and paths that a folder tree cannot show.',
    detail: 'WebGPU renderer · WebAssembly physics',
    mediaAspect: 'square',
    media: {
      alt: 'Animation of CodeGraphy changing graph depth and navigating between related nodes',
      src: '/media/features/view-modes-light.gif',
      posterSrc: '/media/features/posters/view-modes-light.png',
      darkSrc: '/media/features/view-modes-dark.gif',
      darkPosterSrc: '/media/features/posters/view-modes-dark.png',
    },
  },
  {
    index: '03',
    title: 'Ask a smaller question.',
    description:
      'Search, filter, and set Graph Scope without losing the surrounding system. Keep the context you need and quiet the rest.',
    detail: 'Search · filters · persistent scope',
    mediaAspect: 'wide',
    media: {
      alt: 'CodeGraphy search and filter controls',
      src: '/media/features/search-filter-panel-light.png',
      darkSrc: '/media/features/search-filter-panel-dark.png',
    },
  },
  {
    index: '04',
    title: 'Teach the graph new meaning.',
    description:
      'Plugins add framework, engine, document, and visual semantics through typed contracts while Core keeps one consistent graph model.',
    detail: 'Plugin API v3 · package-owned semantics',
    mediaAspect: 'square',
    media: {
      alt: 'Plugin-owned node and edge types in CodeGraphy Graph Scope',
      src: '/media/features/plugin-graph-scope-light.gif',
      posterSrc: '/media/features/posters/plugin-graph-scope-light.png',
      darkSrc: '/media/features/plugin-graph-scope-dark.gif',
      darkPosterSrc: '/media/features/posters/plugin-graph-scope-dark.png',
    },
    supportingAction: {
      href: `${pluginsHref}#build`,
      label: 'Explore the Plugin API',
    },
  },
] satisfies readonly DiveChapter[];

export function ProductDive(): React.ReactElement {
  return (
    <section className="depth-sequence" id="product-dive">
      <header className="depth-intro">
        <h2>From the whole system to one exact relationship.</h2>
        <p>
          Across four depths, CodeGraphy keeps the map visible while you change the question. Each
          layer uses the same Core-owned graph, whether you explore in VS Code or query from the terminal.
        </p>
      </header>

      <div className="depth-chapters">
        {chapters.map((chapter) => (
          <article className="depth-scene" id={`depth-${chapter.index}`} key={chapter.index}>
            <div className="depth-copy">
              <span aria-hidden="true" className="depth-index">{chapter.index}</span>
              <h3>{chapter.title}</h3>
              <p>{chapter.description}</p>
              <span className="depth-detail">{chapter.detail}</span>
              {chapter.supportingAction ? (
                <Link className="depth-action" href={chapter.supportingAction.href}>
                  {chapter.supportingAction.label} <span aria-hidden="true">↗</span>
                </Link>
              ) : null}
            </div>
            <div className={cn('depth-media-shell', chapter.mediaAspect === 'square' && 'depth-media-shell-square')}>
              <div className="depth-media-toolbar">
                <span className="depth-signal" />
                <span>VS Code · CodeGraphy Workspace</span>
                <span>{chapter.index}</span>
              </div>
              <MediaImage
                className={cn(
                  'depth-media',
                  chapter.mediaAspect === 'wide' && 'depth-media-wide',
                  chapter.mediaAspect === 'square' && 'depth-media-square',
                )}
                height={1000}
                imageClassName="h-full w-full object-contain object-center"
                media={chapter.media}
                sizes="(min-width: 1024px) 62vw, 100vw"
                width={1600}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
