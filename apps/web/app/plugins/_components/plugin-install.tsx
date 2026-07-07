import { CodeBlock } from '@/components/code-block';
import { SectionHeader } from '@/components/section-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { npmRegistryRootUrl } from '@/content/links';
import { getPackageVersion } from '@/lib/utils';

const install: { title: string; description: string; command: string[] }[] = [
  {
    title: 'Published package',
    description: 'Install a public plugin package globally, register it in the user-level plugin registry, enable it for the current workspace, then index.',
    command: [
      'npm install -g @codegraphy-dev/core',
      'npm install -g @codegraphy-dev/plugin-vue',
      'codegraphy plugins register @codegraphy-dev/plugin-vue',
      'codegraphy plugins enable @codegraphy-dev/plugin-vue',
      'codegraphy index',
    ],
  },
  {
    title: 'Local package link',
    description: 'Link a local plugin checkout while you develop or test a plugin that is not published yet.',
    command: [
      'npm install -g @codegraphy-dev/core',
      'codegraphy plugins link ~/dev/plugin-godot',
      'codegraphy plugins enable codegraphy.gdscript .',
      'codegraphy index .',
    ],
  },
];

export async function PluginInstall(): Promise<React.ReactElement> {
	const url = `${npmRegistryRootUrl}/${encodeURIComponent('@codegraphy-dev/core')}/latest`;
  const coreVersion = await getPackageVersion(url);

  return (
    <section className="grid gap-6" id="install">
      <div className="grid gap-3 justify-items-start">
        <SectionHeader
          title="Install a plugin"
          description="Plugins install like any npm package. Register and enable a published package, or link a local checkout while you develop one."
        />
        {coreVersion ? (
          <Badge className="font-mono text-[0.7rem]" variant="secondary">
            core v{coreVersion}
          </Badge>
        ) : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {install.map((installMode) => (
          <Card className="flex flex-col overflow-hidden" key={installMode.title}>
            <CardHeader className="flex-1">
              <CardTitle>{installMode.title}</CardTitle>
              <CardDescription>{installMode.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock>{installMode.command.join('\n')}</CodeBlock>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
