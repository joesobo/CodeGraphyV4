import { Computer, Extension, KeyboardArrowRight, OpenInNew, SmartToy } from '@material-symbols-svg/react/rounded';
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
    <section className="rounded-2xl border border-border bg-secondary/50 px-6 py-10 sm:px-10 sm:py-14">
      <SectionHeader
        title="Get started"
        description="Pick the surface that fits how you work: the visual editor, your agents, or the plugin ecosystem."
        className="mx-auto max-w-2xl text-center"
      />

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <Card
          as="article"
          className="flex flex-col border-primary/40 ring-1 ring-primary/20"
          interactive
        >
          <CardHeader className="flex-1">
            <div className="mb-2">
              <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
                <Computer aria-hidden="true" className="size-5" />
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">VS Code extension</CardTitle>
              {extensionVersion ? (
                <Badge className="font-mono text-[0.7rem]" variant="secondary">
                  v{extensionVersion}
                </Badge>
              ) : null}
            </div>
            <CardDescription className="mt-1">
              The visual path. Open the extension directly in VS Code, then index a workspace and
              explore the graph.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <div className="grid w-full gap-3">
              <Link className={cn(buttonVariants(), 'w-full')} href={vscodeExtensionHref}>
                Install in VS Code
                <KeyboardArrowRight aria-hidden="true" />
              </Link>
              <Link className="justify-center" href={marketplaceHref} variant="text">
                Marketplace
              </Link>
            </div>
          </CardFooter>
        </Card>

        <Card as="article" className="flex flex-col" interactive>
          <CardHeader className="flex-1">
            <div className="mb-2">
              <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
                <SmartToy aria-hidden="true" className="size-5" />
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">MCP server</CardTitle>
              {mcpVersion ? (
                <Badge className="font-mono text-[0.7rem]" variant="secondary">
                  v{mcpVersion}
                </Badge>
              ) : null}
            </div>
            <CardDescription className="mt-1">
              Give agents headless access to index and query the same graph — no editor required.
            </CardDescription>
            <CodeBlock className="mt-3 px-3 py-2.5 text-xs leading-5">{mcpInstallCommand}</CodeBlock>
          </CardHeader>
          <CardFooter>
            <Link className={cn(buttonVariants({ variant: 'outline' }), 'w-full')} href={mcpPackageHref}>
              View on npm
              <OpenInNew aria-hidden="true" />
            </Link>
          </CardFooter>
        </Card>

        <Card as="article" className="flex flex-col" interactive>
          <CardHeader className="flex-1">
            <div className="mb-2">
              <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
                <Extension aria-hidden="true" className="size-5" />
              </span>
            </div>
            <CardTitle className="mt-2 text-lg">Plugins</CardTitle>
            <CardDescription className="mt-1">
              Add languages, frameworks, and visual effects with the official plugin packages.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link className={cn(buttonVariants({ variant: 'outline' }), 'w-full')} href={pluginsHref}>
              Browse plugins
              <KeyboardArrowRight aria-hidden="true" />
            </Link>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}
