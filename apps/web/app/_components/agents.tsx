import { CodeBlock } from '@/components/code-block';
import { Link } from '@/components/link';
import { SectionHeader } from '@/components/section-header';
import { githubBlobHref } from '@/content/links';

export function Agents(): React.ReactElement {
  return (
    <section className="agents-scene relative flex items-center overflow-hidden px-5 py-12 sm:px-8 sm:py-16 lg:px-12" id="agents">
      <div className="relative mx-auto grid w-full max-w-[90rem] gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div className="max-w-xl [&_.section-kicker]:text-primary [&_h2]:text-foreground [&_p]:text-muted-foreground">
          <p className="section-kicker mb-4">For agents</p>
          <SectionHeader
            title="Give your agent a map before it starts walking."
            description="The CodeGraphy Agent Skill teaches shell-capable coding agents to index first, ask bounded Graph Query questions, and open source only when the graph says it matters."
          />
          <div className="mt-6 flex flex-wrap gap-5">
            <Link className="text-primary hover:text-foreground" href={`${githubBlobHref}/skills/codegraphy/SKILL.md`} icon="github" variant="text">
              Read the Agent Skill
            </Link>
            <Link className="text-primary hover:text-foreground" href={`${githubBlobHref}/packages/core/README.md`} icon="github" variant="text">
              Explore the Core CLI
            </Link>
          </div>
        </div>

        <div className="agent-terminal rounded-3xl bg-card p-5 text-card-foreground sm:p-7">
          <ol className="grid gap-6">
            <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
              <span className="font-mono text-xs font-semibold text-primary">01</span>
              <div className="min-w-0">
                <h3 className="text-xl font-medium">Build the local map</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Install Core and index the current workspace into the same Graph Cache used by VS Code.
                </p>
                <CodeBlock className="mt-3 bg-secondary text-sm leading-6 text-foreground [&_pre]:break-words [&_pre]:whitespace-pre-wrap">{`npm i -g @codegraphy-dev/core
codegraphy index`}</CodeBlock>
              </div>
            </li>
            <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
              <span className="font-mono text-xs font-semibold text-primary">02</span>
              <div className="min-w-0">
                <h3 className="text-xl font-medium">Ask a bounded question</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Query dependencies, dependents, paths, or scoped symbols before opening source.
                </p>
                <CodeBlock className="mt-3 bg-secondary text-sm leading-6 text-foreground [&_pre]:break-words [&_pre]:whitespace-pre-wrap">{`codegraphy dependencies
packages/core/src/cli/command.ts`}</CodeBlock>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
