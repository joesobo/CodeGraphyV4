import { CodeBlock } from '@/components/code-block';
import { Link } from '@/components/link';
import { SectionHeader } from '@/components/section-header';
import { Card, CardContent } from '@/components/ui/card';
import { githubBlobHref, npmPackageRootHref } from '@/content/links';

const mcpTools: string[] = [
  'codegraphy_status',
  'codegraphy_index',
  'codegraphy_list_nodes',
  'codegraphy_list_edges',
  'codegraphy_list_relationships',
  'codegraphy_list_symbols',
  'codegraphy_find_paths',
];

export function Agents(): React.ReactElement {
  return (
    <section className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center">
      <div className="max-w-xl">
        <SectionHeader
          title="Agents read the same graph."
          description="An agent shouldn't have to read every file just to learn how a repo connects. CodeGraphy MCP runs the same engine headlessly: one deterministic indexing pass writes the workspace Graph Cache, then query tools read the cached connections — no editor open, no guessing."
        />
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          It&apos;s the same Graph Cache the extension renders, so people and agents navigate one
          shared map of the workspace.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link href={`${githubBlobHref}/docs/MCP.md`} variant="text">
            MCP setup guide
          </Link>
          <Link href={`${npmPackageRootHref}/@codegraphy-dev/mcp`} variant="text">
            @codegraphy-dev/mcp
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="grid gap-5 p-5">
          <CodeBlock className="text-xs leading-5">npm install -g @codegraphy-dev/mcp</CodeBlock>
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Ask your agent
            </p>
            <blockquote className="mt-2 rounded-md border-l-2 border-primary bg-secondary/60 p-3 text-sm leading-6 text-foreground">
              &ldquo;Use CodeGraphy to explain how the webview shell relates to the graph
              viewport.&rdquo;
            </blockquote>
          </div>
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Query tools
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {mcpTools.map((tool) => (
                <li
                  className="rounded-md bg-muted px-2.5 py-1 font-mono text-[0.7rem] font-medium text-muted-foreground"
                  key={tool}
                >
                  {tool}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
