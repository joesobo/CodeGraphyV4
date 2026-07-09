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
  '  "$ID" .',
  'codegraphy index .',
].join('\n');

export function PluginInstall(): React.ReactElement {
  return (
    <section className="grid gap-6" id="install">
      <SectionHeader
        title="Install a Plugin"
        description="Set the CodeGraphy Workspace, package, and Plugin ID for the Plugin you want, then run the same install flow."
      />
      <div className="grid max-w-3xl gap-4 rounded-md border border-border bg-card p-5 shadow-sm">
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          This example installs the Vue Plugin. Swap the workspace path, package, and Plugin ID for
          another Plugin; install, register, enable, and Indexing stay in the same order.
        </p>
        <CodeBlock className="p-4 text-xs leading-5">
          {installPluginCommand}
        </CodeBlock>
      </div>
    </section>
  );
}
