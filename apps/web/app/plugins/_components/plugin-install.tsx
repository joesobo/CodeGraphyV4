import { CodeBlock } from '@/components/code-block';
import { SectionHeader } from '@/components/section-header';

const installPluginCommand: string = [
  'npm i -g @codegraphy-dev/plugin-vue',
  'codegraphy plugins register @codegraphy-dev/plugin-vue',
  'codegraphy plugins enable @codegraphy-dev/plugin-vue',
].join('\n');

export function PluginInstall(): React.ReactElement {
  return (
    <section
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start lg:gap-14"
      id="install"
    >
      <div className="lg:sticky lg:top-28">
        <SectionHeader
          title="Install once. Enable per workspace."
          description="Install and register the package once. Enable it in each CodeGraphy Workspace that needs it."
        />
      </div>
      <div className="min-w-0 rounded-3xl bg-card p-4 shadow-sm sm:p-6">
        <CodeBlock className="border-0 bg-secondary p-4 text-xs leading-5 sm:p-5">
          {installPluginCommand}
        </CodeBlock>
      </div>
    </section>
  );
}
