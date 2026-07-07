import {
  Code,
  Database,
  Extension,
  Hub,
  Layers,
  Palette,
  Tune,
  type MaterialSymbolsComponent,
} from '@material-symbols-svg/react/rounded';
import { MediaImage } from '@/components/media-image';
import type { Media } from '@/components/media-image';
import { SectionHeader } from '@/components/section-header';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Feature {
  icon: MaterialSymbolsComponent;
  media: Media;
  title: string;
  summary: string;
  featured?: boolean;
}

const features: Feature[] = [
  {
    icon: Hub,
    media: {
      alt: 'Animation of a 237-node force-directed graph organizing itself into language clusters',
      src: '/media/features/force-graph.gif',
      posterSrc: '/media/features/posters/force-graph.png',
    },
    title: 'Force-directed relationship graph',
    summary: 'Turn folders, files, symbols, imports, references, inheritance, and plugin data into one explorable graph.',
    featured: true,
  },
  {
    icon: Database,
    media: {
      alt: 'Timeline panel scrubbing through commit history',
      src: '/media/timeline-panel.png',
    },
    title: 'Timeline & Graph Cache',
    summary: 'Index Git history to scrub how the graph changes over commits, all backed by a reusable workspace-local cache.',
    featured: true,
  },
  {
    icon: Code,
    media: {
      alt: 'Graph expanded to show function, class, and type symbol nodes',
      src: '/media/symbol-nodes-graph.png',
    },
    title: 'Symbol-level detail',
    summary: 'Expand any file into its functions, classes, interfaces, and types with built-in Tree-sitter analysis.',
  },
  {
    icon: Tune,
    media: {
      alt: 'Animation of searching the graph and scoping it with custom filter globs',
      src: '/media/features/search-filter-scope.gif',
      posterSrc: '/media/features/posters/search-filter-scope.png',
    },
    title: 'Search, filter, and scope',
    summary: 'Search nodes, then persist filters to hide tests, generated files, or any noise until the graph answers your question.',
  },
  {
    icon: Layers,
    media: {
      alt: 'Animation of switching the graph between the 2D canvas and the 3D WebGL view',
      src: '/media/features/2d-3d-views.gif',
      posterSrc: '/media/features/posters/2d-3d-views.png',
    },
    title: '2D and 3D views',
    summary: 'Work fast in the 2D canvas, or switch to a 3D WebGL view when the shape of the repository matters.',
  },
  {
    icon: Palette,
    media: {
      alt: 'Animation of the themes panel toggling CSS snippets and particle effects on the graph',
      src: '/media/features/themes-particles.gif',
      posterSrc: '/media/features/posters/themes-particles.png',
    },
    title: 'Themeable at every level',
    summary: 'Inherit your VS Code theme, load workspace CSS snippets, or style individual nodes and edges.',
		featured: true,
  },
  {
    icon: Extension,
    media: {
      alt: 'Animation of a Godot workspace graph with plugin-owned node and edge types toggled in Graph Scope',
      src: '/media/features/plugin-graph-scope.gif',
      posterSrc: '/media/features/posters/plugin-graph-scope.png',
    },
    title: 'Extensible with plugins',
    summary: 'Add languages, frameworks, documents, and visual effects through the typed Plugin API.',
		featured: true,
  },
];

export function Features(): React.ReactElement {
  return (
    <section className="grid gap-8" id="features">
      <SectionHeader
        title="Features"
        description="Everything CodeGraphy adds to your editor — the graph itself, symbol-level detail, search and filters, theming, 2D and 3D views, and headless access for agents."
      />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-6">
        {features.map((feature) => (
          <Card
            as="article"
            className={cn(
              'group flex flex-col overflow-hidden',
              feature.featured ? 'lg:col-span-3' : 'lg:col-span-2',
            )}
            interactive
            key={feature.title}
          >
            <MediaImage
              className="h-48 border-b border-border bg-secondary transition-[height] duration-500 ease-in-out group-hover:h-72"
              fill
              imageClassName="object-cover object-top"
              media={feature.media}
              sizes="(min-width: 1024px) 50vw, (min-width: 768px) 50vw, 100vw"
            />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                <feature.icon aria-hidden="true" className="size-4" />
                {feature.title}
              </CardTitle>
              <CardDescription className="mt-1">{feature.summary}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
