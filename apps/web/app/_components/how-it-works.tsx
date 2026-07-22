import {
  AccountTree,
  Computer,
  Database,
  East,
  Extension,
  Folder,
  Settings,
  SmartToy,
  Terminal,
  type MaterialSymbolsComponent,
} from '@material-symbols-svg/react/rounded';
import { Icon } from '@/components/icon';
import { Link } from '@/components/link';
import { SectionHeader } from '@/components/section-header';
import { pluginContent } from '@/content/plugins';

interface StageNode {
  icon: MaterialSymbolsComponent;
  title: string;
}

const sourceNodes: StageNode[] = [
  { icon: Folder, title: 'Workspace files' },
  { icon: Settings, title: 'Settings' },
  { icon: AccountTree, title: 'Language structure' },
];

const surfaceNodes: StageNode[] = [
  { icon: Computer, title: 'VS Code extension' },
  { icon: SmartToy, title: 'CodeGraphy Agent Skill' },
  { icon: Terminal, title: 'CLI' },
];

const coreChips: string[] = ['Tree-sitter', 'Indexing', 'Graph Cache', 'Plugin host'];

export function HowItWorks(): React.ReactElement {
  return (
    <section className="mx-auto grid w-full max-w-[90rem] gap-12 px-5 sm:px-8 lg:px-12">
      <SectionHeader
        title="One graph. More ways to understand it."
        description="The Core Package indexes a CodeGraphy Workspace once, stores the result locally, and gives the extension, the CLI, and shell-capable agents the same source of structural truth."
      />

      <div className="grid w-full gap-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)_auto_minmax(0,1fr)] lg:items-center">
          <Stage label="Reads from" nodes={sourceNodes} />
          <FlowConnector label="index" />
          <CoreCard />
          <FlowConnector label="serves" />
          <Stage label="Accessed via" nodes={surfaceNodes} />
        </div>

        <PluginBand />
      </div>
    </section>
  );
}

function Stage({
  label,
  nodes,
}: {
  label: string;
  nodes: readonly StageNode[];
}): React.ReactElement {
  return (
    <div className="grid gap-2.5 rounded-3xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur-sm">
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {nodes.map((node) => (
        <div
          className="flex items-center gap-2.5 rounded-2xl border border-border bg-background/70 px-3 py-3 text-sm font-medium"
          key={node.title}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
            <node.icon aria-hidden="true" className="size-4" />
          </span>
          {node.title}
        </div>
      ))}
    </div>
  );
}

function CoreCard(): React.ReactElement {
  return (
    <div className="rounded-3xl bg-[#0b1e35] p-6 text-white shadow-xl">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background text-primary">
          <Database aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#a8c7ff]">
            Core engine
          </p>
          <h3 className="truncate font-mono text-base font-semibold">@codegraphy-dev/core</h3>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6">
        Owns File Discovery, Tree-sitter Analysis, Plugin Analysis, Graph Projection, the local
        Graph Cache, and every Graph Query.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {coreChips.map((chip) => (
          <li
            className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-[0.7rem] font-semibold text-white/75"
            key={chip}
          >
            {chip}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FlowConnector({ label }: { label: string }): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-1 text-muted-foreground lg:py-0">
      <span className="font-mono text-[0.6rem] font-semibold uppercase tracking-widest">
        {label}
      </span>
      <East aria-hidden="true" className="size-5 rotate-90 lg:rotate-0" />
    </div>
  );
}

function PluginBand(): React.ReactElement {
  return (
    <div className="rounded-3xl border border-primary/25 bg-secondary/45 p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2">
            <Extension aria-hidden="true" className="size-4 text-primary" />
            <span className="font-mono text-sm font-semibold">Plugin API</span>
            <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
              extends core
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            Plugins teach core new languages, node and edge types, and visual effects. Every
            official plugin is built on the same typed contracts.
          </p>
        </div>
        <ul className="flex flex-wrap items-center gap-2">
          {pluginContent.map((plugin) => (
            <li key={plugin.id}>
              <Link
                className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/50 hover:text-primary"
                href={plugin.href}
              >
                <Icon className="size-4" src={plugin.iconUrl} />
                {plugin.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
