import { CodeBlock } from '@/components/code-block';
import { Link } from '@/components/link';
import { SectionHeader } from '@/components/section-header';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  extensionVersionUrl,
  marketplaceHref,
  npmPackageRootHref,
  npmRegistryRootUrl,
  pluginsHref,
  vscodeExtensionHref,
} from '@/content/links';
import { cn, getPackageVersion } from '@/lib/utils';

const mcpPackageName = '@codegraphy-dev/mcp';
const mcpPackageHref = `${npmPackageRootHref}/${mcpPackageName}`;
const mcpVersionUrl = `${npmRegistryRootUrl}/${encodeURIComponent(mcpPackageName)}/latest`;
const mcpInstallCommand = `npm install -g ${mcpPackageName}`;

export async function GetStarted(): Promise<React.ReactElement> {
  const extensionVersionPromise = getPackageVersion(extensionVersionUrl);
  const mcpVersionPromise = getPackageVersion(mcpVersionUrl);

  const extensionVersion = await extensionVersionPromise;
  const mcpVersion = await mcpVersionPromise;

  return (
    <section className="w-full border-y border-border bg-secondary/50 px-6 py-16 sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          title="Get started"
          description="Start with the VS Code extension, connect CodeGraphy to your agents, or build on the Plugin ecosystem."
          className="mx-auto max-w-2xl text-center"
        />

        <div className="mx-auto mt-10 grid w-full max-w-6xl gap-5 md:grid-cols-3">
          <Card
            as="article"
            className="min-w-0 flex flex-col border-primary/40 ring-1 ring-primary/20"
            interactive
          >
            <CardHeader className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">VS Code Extension</CardTitle>
                {extensionVersion ? (
                  <Badge className="font-mono text-[0.7rem]" variant="secondary">
                    v{extensionVersion}
                  </Badge>
                ) : null}
              </div>
              <CardDescription className="mt-1">
                The visual path. Install the extension, index a CodeGraphy Workspace, and explore
                the Relationship Graph without leaving your editor.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <div className="grid w-full gap-3">
                <Link className={cn(buttonVariants(), 'w-full')} href={vscodeExtensionHref} icon="vscode">
                  Open in VS Code
                </Link>
                <Link
                  className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
                  href={marketplaceHref}
                >
                  View on Marketplace
                </Link>
              </div>
            </CardFooter>
          </Card>

          <Card as="article" className="min-w-0 flex flex-col" interactive>
            <CardHeader className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">MCP</CardTitle>
                {mcpVersion ? (
                  <Badge className="font-mono text-[0.7rem]" variant="secondary">
                    v{mcpVersion}
                  </Badge>
                ) : null}
              </div>
              <CardDescription className="mt-1">
                Give agents headless access to index and query the same Graph Cache — no editor required.
              </CardDescription>
              <CodeBlock className="mt-3 px-3 py-2.5 text-xs leading-5">
                {mcpInstallCommand}
              </CodeBlock>
            </CardHeader>
            <CardFooter>
              <Link
                aria-label={`View ${mcpPackageName} on npm`}
                className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
                href={mcpPackageHref}
              >
                View on npm
              </Link>
            </CardFooter>
          </Card>

          <Card as="article" className="min-w-0 flex flex-col" interactive>
            <CardHeader className="flex-1">
              <CardTitle className="text-lg">Plugins</CardTitle>
              <CardDescription className="mt-1">
                Add languages, Relationship Graph semantics, and visual effects with the official Plugin packages.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link
                className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
                href={pluginsHref}
              >
                Browse Plugins
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}
