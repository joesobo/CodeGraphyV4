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
  { icon: AccountTree, title: 'Git history' },
];

const surfaceNodes: StageNode[] = [
  { icon: Computer, title: 'VS Code extension' },
  { icon: SmartToy, title: 'MCP server' },
  { icon: Terminal, title: 'CLI' },
];

const coreChips: string[] = ['Tree-sitter', 'Indexing', 'Graph Cache', 'Plugin host'];

export function HowItWorks(): React.ReactElement {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6 px-6 sm:px-8 lg:px-12">
      <SectionHeader
        title="How CodeGraphy works"
        description="One headless engine sits at the center. It reads your workspace, analyzes it with Tree-sitter, and caches every connection, then serves that graph to the extension, agents, the CLI, and plugins."
      />

      <div className="mx-auto grid w-full max-w-5xl gap-4">
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
    <div className="grid gap-2.5 rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {nodes.map((node) => (
        <div
          className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium"
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
    <div className="rounded-xl bg-primary p-5 text-primary-foreground shadow-md dark:bg-[oklch(0.42_0.1_242.7)] dark:text-foreground">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background text-primary">
          <Database aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-primary-foreground/80 dark:text-foreground/80">
            Core engine
          </p>
          <h3 className="truncate font-mono text-base font-semibold">@codegraphy-dev/core</h3>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6">
        Reads the workspace, analyzes every file with Tree-sitter, and indexes the relationships
        into a cached graph. Headless, with the plugin host built in.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {coreChips.map((chip) => (
          <li
            className="rounded-md bg-background px-2.5 py-1 font-mono text-[0.7rem] font-semibold text-foreground"
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
    <div className="rounded-xl border border-dashed border-primary/40 bg-secondary/40 p-4 sm:p-5">
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
