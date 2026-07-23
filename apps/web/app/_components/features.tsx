import {
  Code,
  Extension,
  Hub,
  Layers,
  Tune,
  type MaterialSymbolsComponent,
} from '@material-symbols-svg/react/rounded';
import { MediaImage, type Media } from '@/components/media-image';
import { SectionHeader } from '@/components/section-header';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type FeatureLayout = 'square' | 'wide';

interface Feature {
  icon: MaterialSymbolsComponent;
  layout: FeatureLayout;
  media: Media;
  summary: string;
  title: string;
}

const features: Feature[] = [
  {
    icon: Hub,
    layout: 'square',
    media: gifMedia(
      'force-graph',
      'Animation of a force-directed Relationship Graph being explored inside CodeGraphy',
    ),
    title: 'A Relationship Graph you can explore',
    summary: 'Files, folders, packages, symbols, imports, calls, inheritance, and Plugin data rendered on a fast custom WebGPU graph surface.',
  },
  {
    icon: Extension,
    layout: 'square',
    media: gifMedia(
      'plugin-graph-scope',
      'Animation of a Godot CodeGraphy Workspace with Plugin-owned Node Types and Edge Types toggled in Graph Scope',
    ),
    title: 'Extensible with Plugins',
    summary: 'Add languages, frameworks, documents, and custom Relationship Graph semantics through the typed Plugin API.',
  },
  {
    icon: Tune,
    layout: 'wide',
    media: imageMedia(
      'search-filter-panel',
      'Search and Filter controls with persistent workspace Filters enabled',
    ),
    title: 'Search, filter, and scope',
    summary: 'Search the Visible Graph in the moment, then save persistent Filters that keep tests, generated files, and other noise out of view.',
  },
  {
    icon: Code,
    layout: 'square',
    media: gifMedia(
      'symbol-nodes',
      'Animation of a graph expanding from file nodes into function, class, and type symbol nodes',
    ),
    title: 'Symbol-level detail',
    summary: 'Expand any file into its functions, classes, interfaces, and types with built-in Tree-sitter analysis.',
  },
  {
    icon: Layers,
    layout: 'square',
    media: {
      alt: 'CodeGraphy Relationship Graph showing connected files, folders, packages, and symbols',
      src: '/media/header-workspace-graph-light.png',
      darkSrc: '/media/header-workspace-graph-dark.png',
    },
    title: 'Focus without losing context',
    summary: 'Use Depth Mode, Collapse, selection, and graph navigation to move from the system-wide map to the code that matters now.',
  },
];

function gifMedia(name: string, alt: string): Media {
  return {
    alt,
    src: `/media/features/${name}-light.gif`,
    posterSrc: `/media/features/posters/${name}-light.png`,
    darkSrc: `/media/features/${name}-dark.gif`,
    darkPosterSrc: `/media/features/posters/${name}-dark.png`,
  };
}

function imageMedia(name: string, alt: string): Media {
  return {
    alt,
    src: `/media/features/${name}-light.png`,
    darkSrc: `/media/features/${name}-dark.png`,
  };
}

export function Features(): React.ReactElement {
  return (
    <section className="mx-auto grid w-full max-w-[90rem] gap-12 px-5 sm:px-8 lg:px-12" id="features">
      <SectionHeader
        title="From the whole system to one exact relationship."
        description="Shape the Visible Graph with Graph Scope, persistent Filters, Search, Collapse, and focus controls while keeping the indexed knowledge underneath."
      />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-6">
        {features.map((feature) => (
          <FeatureCard feature={feature} key={feature.title} />
        ))}
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: Feature }): React.ReactElement {
  return (
    <Card
      as="article"
      className={cn(
        'group flex min-w-0 flex-col overflow-hidden rounded-3xl transition-[border-color,box-shadow] duration-300 hover:border-primary/35 hover:shadow-[0_18px_50px_rgb(8_74_82_/_0.12)]',
        feature.layout === 'wide' ? 'md:col-span-2 lg:col-span-6' : 'lg:col-span-3',
      )}
    >
      <FeatureMedia layout={feature.layout} media={feature.media} />
      <CardHeader className="shrink-0">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
            <feature.icon aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base text-foreground">{feature.title}</CardTitle>
            <CardDescription className="mt-1">{feature.summary}</CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function FeatureMedia({
  layout,
  media,
}: {
  layout: FeatureLayout;
  media: Media;
}): React.ReactElement {
  return (
    <MediaImage
      className={cn(
        'min-h-0 border-b border-border bg-graph-surface',
        layout === 'wide' ? 'aspect-[20/7]' : 'aspect-square',
      )}
      fill
      imageClassName="bg-graph-surface object-contain object-center"
      media={media}
      sizes={
        layout === 'wide'
          ? '(min-width: 1024px) 100vw, 100vw'
          : '(min-width: 1024px) 50vw, (min-width: 768px) 50vw, 100vw'
      }
    />
  );
}
