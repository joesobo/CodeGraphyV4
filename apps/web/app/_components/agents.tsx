import { CodeBlock } from '@/components/code-block';
import { Link } from '@/components/link';
import { SectionHeader } from '@/components/section-header';
import { Card, CardContent } from '@/components/ui/card';
import { npmPackageRootHref } from '@/content/links';

const agentSkillHref = 'https://github.com/codegraphy/skills';
const corePackageHref = `${npmPackageRootHref}/@codegraphy-dev/core`;

const agentCapabilities: string[] = [
  'Index the CodeGraphy Workspace',
  'List Nodes, Edges, and symbols',
  'Trace paths between files',
  'Explain Relationships from the Graph Cache',
];

export function Agents(): React.ReactElement {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-10 px-6 sm:px-8 lg:grid-cols-[0.9fr_1fr] lg:items-center lg:px-12">
      <div className="max-w-xl">
        <SectionHeader
          title="Let agents read the Relationship Graph."
          description="The CodeGraphy Agent Skill teaches coding agents to query the same local Graph Cache that powers the VS Code extension. One CLI answers focused questions about Nodes, Edges, dependencies, dependents, and paths."
        />
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Index the CodeGraphy Workspace once, then use your agent for targeted Relationship
          questions instead of broad file-by-file exploration.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link href={agentSkillHref} icon="github" variant="text">
            CodeGraphy Agent Skill
          </Link>
          <Link href={corePackageHref} variant="text">
            @codegraphy-dev/core
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="grid gap-5 p-5">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Install
            </p>
            <CodeBlock className="mt-2 text-xs leading-5">
              npx skills@latest add codegraphy/skills
            </CodeBlock>
          </div>

          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Ask your agent
            </p>
            <blockquote className="mt-2 rounded-md bg-secondary/60 px-3 py-2.5 text-sm leading-6 text-foreground">
              codegraphy search SettingsPanel
            </blockquote>
          </div>

          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              What it unlocks
            </p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {agentCapabilities.map((capability) => (
                <li
                  className="rounded-md bg-muted px-3 py-2 text-sm font-medium text-muted-foreground"
                  key={capability}
                >
                  {capability}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
