import type { Media } from '@/components/media-image';
import { MediaImage } from '@/components/media-image';
import { cn } from '@/lib/utils';

interface DiveChapter {
  description: string;
  detail: string;
  index: string;
  media: Media;
  mediaAspect?: 'wide';
  title: string;
}

const chapters = [
  {
    index: '01',
    title: 'Map the whole workspace.',
    description:
      'Index files, folders, packages, and symbols into one local Relationship Graph. Start wide, then follow the connections that matter.',
    detail: 'One graph cache · local source · no upload',
    media: {
      alt: 'Animation of CodeGraphy switching between workspace graph views',
      src: '/media/features/view-modes-light.gif',
      posterSrc: '/media/features/posters/view-modes-light.png',
      darkSrc: '/media/features/view-modes-dark.gif',
      darkPosterSrc: '/media/features/posters/view-modes-dark.png',
    },
  },
  {
    index: '02',
    title: 'Move through relationships.',
    description:
      'Pan, zoom, focus, and expand the graph as a living system. Physics reveals clusters and paths that a folder tree cannot show.',
    detail: 'WebGPU renderer · WebAssembly physics',
    media: {
      alt: 'Force-directed CodeGraphy Relationship Graph',
      src: '/media/features/force-graph-light.gif',
      posterSrc: '/media/features/posters/force-graph-light.png',
      darkSrc: '/media/features/force-graph-dark.gif',
      darkPosterSrc: '/media/features/posters/force-graph-dark.png',
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
    media: {
      alt: 'Plugin-owned node and edge types in CodeGraphy Graph Scope',
      src: '/media/features/plugin-graph-scope-light.gif',
      posterSrc: '/media/features/posters/plugin-graph-scope-light.png',
      darkSrc: '/media/features/plugin-graph-scope-dark.gif',
      darkPosterSrc: '/media/features/posters/plugin-graph-scope-dark.png',
    },
  },
] satisfies readonly DiveChapter[];

export function ProductDive(): React.ReactElement {
  return (
    <section className="depth-sequence" id="product-dive">
      <header className="depth-intro">
        <p className="section-kicker">One graph · four depths</p>
        <h2>From the whole system to one exact relationship.</h2>
        <p>
          CodeGraphy keeps the map visible while you change the question. Each layer uses the same
          Core-owned graph, whether you explore in VS Code or query from the terminal.
        </p>
      </header>

      <div className="depth-chapters">
        {chapters.map((chapter) => (
          <article className="depth-scene" id={`depth-${chapter.index}`} key={chapter.index}>
            <div className="depth-copy">
              <p className="depth-index">{chapter.index} / 04</p>
              <h3>{chapter.title}</h3>
              <p>{chapter.description}</p>
              <span>{chapter.detail}</span>
            </div>
            <div className="depth-media-shell">
              <div className="depth-media-toolbar">
                <span className="depth-signal" />
                <span>VS Code · CodeGraphy Workspace</span>
                <span>{chapter.index}</span>
              </div>
              <MediaImage
                className={cn('depth-media', chapter.mediaAspect === 'wide' && 'depth-media-wide')}
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
