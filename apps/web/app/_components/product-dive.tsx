import type { Media } from '@/components/media-image';
import { Link } from '@/components/link';
import { MediaImage } from '@/components/media-image';
import { desktopRelease, pluginsHref } from '@/content/links';
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
      alt: 'CodeGraphy workspace Relationship Graph with connected file, package, and symbol clusters',
      src: '/media/header-workspace-graph-light.png',
      darkSrc: '/media/header-workspace-graph-dark.png',
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
      alt: 'Force-directed CodeGraphy Relationship Graph settling into workspace clusters',
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

      <article className="desktop-dive" id="desktop">
        <div className="desktop-dive-copy">
          <span className="desktop-dive-kicker">macOS desktop · local by design</span>
          <h3>Keep the map beside the code.</h3>
          <p>
            Open a CodeGraphy Workspace, browse Files and Folders, edit a File, and inspect its
            Relationships without leaving one focused window. Core owns the Relationship Graph;
            your source, settings, and Graph Cache stay on your Mac.
          </p>
          <div className="desktop-dive-facts" aria-label="Desktop app data ownership">
            <span>Local Core process</span>
            <span>Workspace-owned Graph Cache</span>
            <span>No source upload</span>
          </div>
          <div className="desktop-dive-release">
            <span className="desktop-dive-status">{desktopRelease.label}</span>
            <p>
              The app is not a public download yet. Apple signing and notarization must pass
              release verification first.
            </p>
          </div>
          <Link className="depth-action desktop-dive-action" href={desktopRelease.sourceHref}>
            Inspect the desktop source <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <div
          aria-label="Illustration of the CodeGraphy desktop app with a File hierarchy, editor, and Relationship Graph"
          className="desktop-workbench"
          role="img"
        >
          <div aria-hidden="true" className="desktop-workbench-titlebar">
            <span className="desktop-traffic-lights" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>CodeGraphyV4</span>
            <span>Local Workspace</span>
          </div>
          <div aria-hidden="true" className="desktop-workbench-body">
            <div className="desktop-files">
              <span className="desktop-pane-label">Files</span>
              <span className="desktop-tree-row desktop-tree-folder">⌄ apps</span>
              <span className="desktop-tree-row desktop-tree-folder desktop-tree-indent">⌄ desktop</span>
              <span className="desktop-tree-row desktop-tree-file desktop-tree-indent-2">App.tsx</span>
              <span className="desktop-tree-row desktop-tree-file desktop-tree-indent-2 desktop-tree-active">GraphView.tsx</span>
              <span className="desktop-tree-row desktop-tree-file desktop-tree-indent-2">theme.css</span>
              <span className="desktop-tree-row desktop-tree-folder">› packages</span>
            </div>
            <div className="desktop-editor">
              <div className="desktop-tab"><span>GraphView.tsx</span><span aria-hidden="true">×</span></div>
              <div className="desktop-code" aria-hidden="true">
                <span><b>1</b><i>import</i> {'{ GraphStage }'} <i>from</i> <em>&apos;./graph&apos;</em>;</span>
                <span><b>2</b></span>
                <span><b>3</b><i>export function</i> <strong>GraphView</strong>() {'{'}</span>
                <span><b>4</b>  <i>return</i> (</span>
                <span><b>5</b>    {'<'}<strong>GraphStage</strong></span>
                <span><b>6</b>      nodes={'{nodes}'}</span>
                <span><b>7</b>      relationships={'{relationships}'}</span>
                <span><b>8</b>    /{'>'}</span>
                <span><b>9</b>  );</span>
                <span><b>10</b>{'}'}</span>
              </div>
            </div>
            <div className="desktop-graph">
              <div className="desktop-graph-header">
                <span>Relationship Graph</span>
                <span>6 Nodes · 7 Relationships</span>
              </div>
              <svg aria-hidden="true" className="desktop-graph-map" viewBox="0 0 420 300">
                <g className="desktop-relationships">
                  <path d="M80 162 L176 80 L280 96 L346 166 L268 236 L144 226 Z" />
                  <path d="M80 162 L144 226 M176 80 L144 226 M176 80 L268 236 M280 96 L268 236 M346 166 L176 80" />
                </g>
                <g className="desktop-nodes">
                  <rect height="42" rx="10" width="54" x="53" y="141" />
                  <rect height="48" rx="11" width="58" x="147" y="56" />
                  <rect height="42" rx="10" width="54" x="253" y="75" />
                  <rect height="46" rx="11" width="58" x="317" y="143" />
                  <rect height="44" rx="10" width="54" x="241" y="214" />
                  <rect className="desktop-node-selected" height="50" rx="12" width="62" x="113" y="201" />
                </g>
              </svg>
              <span className="desktop-graph-selection">GraphView.tsx</span>
            </div>
          </div>
          <div aria-hidden="true" className="desktop-workbench-status">
            <span>Core ready</span>
            <span>.codegraphy/graph.sqlite</span>
          </div>
        </div>
      </article>
    </section>
  );
}
