import { CodeBlock } from '@/components/code-block';
import { SectionHeader } from '@/components/section-header';

const installPluginCommand: string = [
  'cd examples/example-vue',
  '',
  'PKG=@codegraphy-dev/plugin-vue',
  'ID=codegraphy.vue',
  '',
  'npm i -g "$PKG"',
  'codegraphy plugins register \\',
  '  "$PKG"',
  'codegraphy plugins enable \\',
  '  "$ID"',
  'codegraphy index',
].join('\n');

export function PluginInstall(): React.ReactElement {
  return (
    <section className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start lg:gap-14" id="install">
      <div className="lg:sticky lg:top-28">
        <SectionHeader
          title="Install once. Enable per workspace."
          description="This Vue example shows the full flow. Change the package and Plugin ID for another official Plugin."
        />
      </div>
      <div className="rounded-3xl bg-card p-4 shadow-sm sm:p-6">
        <CodeBlock className="border-0 bg-secondary p-4 text-xs leading-5 sm:p-5">
          {installPluginCommand}
        </CodeBlock>
      </div>
    </section>
  );
}
