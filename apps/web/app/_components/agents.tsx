import { CodeBlock } from '@/components/code-block';
import { Link } from '@/components/link';
import { SectionHeader } from '@/components/section-header';
import { githubBlobHref } from '@/content/links';

const graphQuestions = [
  'Which files depend on this module?',
  'What path connects these two files?',
  'Which symbols live in this part of the graph?',
] as const;

export function Agents(): React.ReactElement {
  return (
    <section className="relative overflow-hidden bg-[#061722] px-5 py-24 text-white sm:px-8 sm:py-32 lg:px-12">
      <div aria-hidden="true" className="ocean-grid absolute inset-0 opacity-45" />
      <div className="relative mx-auto grid w-full max-w-[90rem] gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div className="max-w-xl [&_.section-kicker]:text-[#61d8ca] [&_h2]:text-white [&_p]:text-white/60">
          <SectionHeader
            title="Give your agent a map before it starts walking."
            description="The CodeGraphy Agent Skill teaches shell-capable coding agents to index first, ask bounded Graph Query questions, and open source only when the graph says it matters."
          />
          <p className="mt-6 text-base leading-7 text-white/60">
            The VS Code extension and terminal use the same Core-owned Graph Cache. No parallel
            analysis service, no uploaded source, and no separate graph for agents.
          </p>
          <div className="mt-7 flex flex-wrap gap-5">
            <Link className="text-[#8be4d9]" href={`${githubBlobHref}/skills/codegraphy/SKILL.md`} icon="github" variant="text">
              Read the Agent Skill
            </Link>
            <Link className="text-[#8be4d9]" href={`${githubBlobHref}/packages/core/README.md`} icon="github" variant="text">
              Explore the Core CLI
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/12 bg-[#0a202d]/90 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
            <span className="size-2.5 rounded-full bg-[#ff776d]" />
            <span className="size-2.5 rounded-full bg-[#f5c15d]" />
            <span className="size-2.5 rounded-full bg-[#61d8ca]" />
            <span className="ml-3 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-white/38">codegraphy — zsh</span>
          </div>
          <div className="grid gap-7 p-5 sm:p-7">
            <div>
              <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#61d8ca]">Build the local map</p>
              <CodeBlock className="mt-3 border-white/10 bg-black/22 text-xs leading-6 text-white/78">{`npm install --global @codegraphy-dev/core@latest
codegraphy index`}</CodeBlock>
            </div>
            <div>
              <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#61d8ca]">Ask one bounded question</p>
              <CodeBlock className="mt-3 border-white/10 bg-black/22 text-xs leading-6 text-white/78">codegraphy dependencies packages/core/src/cli/command.ts</CodeBlock>
            </div>
            <ul className="grid gap-2 sm:grid-cols-3">
              {graphQuestions.map((question) => (
                <li className="rounded-2xl border border-white/8 bg-white/5 p-3 text-xs leading-5 text-white/55" key={question}>
                  {question}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
