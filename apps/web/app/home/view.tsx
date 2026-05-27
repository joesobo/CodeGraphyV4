import { Button } from '../_ui/button';
import { Card } from '../_ui/card';
import { GitHubIcon, VsCodeIcon } from '../_ui/icons';
import { SiteFooter } from '../_site/footer';
import { SiteHeader } from '../_site/header';
import {
  coreFeatures,
  faqItems,
  galleryItems,
  githubHref,
  heroHighlights,
  installHref,
  optionalPackages,
  socialProofItems,
  workflowSteps,
} from './content';
import type { FaqAnswerBlock, FaqTextPart } from './content';

function renderFaqText(parts: FaqTextPart[], keyPrefix: string): React.ReactNode {
  return parts.map((part, index) => {
    if (typeof part === 'string') {
      return part;
    }

    if (part.kind === 'code') {
      return (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.92em] text-foreground" key={`${keyPrefix}-${index}`}>
          {part.text}
        </code>
      );
    }

    return (
      <a
        className="font-semibold text-[hsl(var(--brand-blue))] underline-offset-4 hover:underline"
        href={part.href}
        key={`${keyPrefix}-${index}`}
        rel="noreferrer"
        target="_blank"
      >
        {part.text}
      </a>
    );
  });
}

function FaqAnswer({ blocks }: { blocks: FaqAnswerBlock[] }): React.ReactElement {
  return (
    <div className="mt-4 grid gap-4 text-muted-foreground">
      {blocks.map((block, blockIndex) => {
        if (block.type === 'paragraph') {
          return (
            <p className="max-w-4xl leading-7" key={`paragraph-${blockIndex}`}>
              {renderFaqText(block.parts, `paragraph-${blockIndex}`)}
            </p>
          );
        }

        if (block.type === 'list') {
          return (
            <div key={`list-${blockIndex}`}>
              {block.label ? <p className="mb-2 text-sm font-bold text-foreground">{block.label}</p> : null}
              <ul className="grid max-w-4xl list-disc gap-2 pl-5 leading-7">
                {block.items.map((item, itemIndex) => (
                  <li key={`list-${blockIndex}-${itemIndex}`}>
                    {renderFaqText(item, `list-${blockIndex}-${itemIndex}`)}
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        if (block.type === 'code') {
          return (
            <pre
              className="max-w-4xl overflow-x-auto rounded-md border border-border bg-muted/70 p-4 text-sm leading-7 text-foreground"
              key={`code-${blockIndex}`}
            >
              <code>{block.code}</code>
            </pre>
          );
        }

        if (block.type === 'image') {
          return (
            <figure className="max-w-4xl overflow-hidden rounded-md border border-border bg-background" key={`image-${blockIndex}`}>
              <img alt={block.alt} className="aspect-[16/9] w-full object-cover" src={block.src} />
              <figcaption className="px-4 py-3 text-sm leading-6">{block.caption}</figcaption>
            </figure>
          );
        }

        return (
          <div className="max-w-4xl" key={`links-${blockIndex}`}>
            {block.label ? <p className="mb-2 text-sm font-bold text-foreground">{block.label}</p> : null}
            <div className="flex flex-wrap gap-2">
              {block.links.map(link => (
                <a
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-[hsl(var(--brand-blue))] hover:text-[hsl(var(--brand-blue))]"
                  href={link.href}
                  key={link.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {link.text}
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HomeView(): React.ReactElement {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden">
          <img
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-35"
            src="/product-media/hero-relationship-graph.png"
          />
          <div className="home-hero-overlay absolute inset-0" />
          <div className="relative mx-auto grid min-h-[720px] max-w-7xl items-end gap-10 px-5 pb-20 pt-28 md:grid-cols-[0.9fr_0.7fr] md:px-8">
            <div className="max-w-3xl">
              <p className="font-note section-kicker-blue mb-3 text-lg">
                Follow the natural shape.
              </p>
              <h1 className="site-heading text-5xl leading-[0.95] text-foreground sm:text-7xl lg:text-8xl">
                See how everything connects.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                CodeGraphy maps the real structure of your code so files, symbols, plugins, and agents can work from the same relationships.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <a href={installHref}>
                    <VsCodeIcon className="h-[18px] w-[18px]" />
                    Install CodeGraphy
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href={githubHref}>
                    <GitHubIcon className="h-[18px] w-[18px]" />
                    GitHub
                  </a>
                </Button>
              </div>
            </div>
            <aside className="hero-studio-panel">
              <div className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4">
                <p className="section-kicker-blue text-xs font-black uppercase tracking-[0.08em]">Graph studio</p>
                <span className="rounded-full bg-[hsl(var(--brand-green)/0.12)] px-3 py-1 text-xs font-bold text-[hsl(var(--brand-green))]">
                  Local first
                </span>
              </div>
              <div className="grid gap-3 p-5">
                {heroHighlights.map(item => {
                  const Icon = item.icon;

                  return (
                    <div className="hero-tool-row" key={item.label}>
                      <span className="icon-badge">
                        <Icon size={18} />
                      </span>
                      <div>
                        <p className="font-bold text-foreground">{item.label}</p>
                        <p className="text-sm leading-6 text-muted-foreground">{item.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="graph-note font-note mx-5 mb-5 rounded-md px-4 py-3 text-[15px] leading-7 text-foreground">
                Tip: nearby nodes usually mean nearby decisions.
              </p>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
            <div className="grid gap-8 md:grid-cols-[0.8fr_1fr] md:items-end">
              <div>
                <p className="section-kicker-blue mb-3 text-xs font-black uppercase tracking-[0.08em]">Social proof</p>
                <h2 className="site-heading text-4xl sm:text-5xl">
                  Popular repos, mapped from the top down.
                </h2>
              </div>
              <p className="text-lg leading-8 text-muted-foreground">
                This section will become a demonstration gallery for curated popular repositories, each with tuned themes and settings so people can see what high-level graph views look like. CodeGraphy itself can be one of the examples.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {socialProofItems.map(item => {
                const Icon = item.icon;

                return (
                  <Card className="notebook-card overflow-hidden" key={item.title}>
                    <img alt="" className="aspect-[16/10] w-full object-cover" src={item.image} />
                    <div className="p-5">
                      <div className="mb-3 flex items-center gap-3">
                        <span className="icon-badge">
                          <Icon size={18} />
                        </span>
                        <h3 className="text-xl font-bold">{item.title}</h3>
                      </div>
                      <p className="leading-7 text-muted-foreground">{item.text}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
        </section>

        <section className="section-plain border-y border-border/70">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:grid-cols-[0.8fr_1fr] md:px-8">
            <div>
              <p className="section-kicker-orange mb-3 text-xs font-black uppercase tracking-[0.08em]">Problem</p>
              <h2 className="site-heading text-4xl sm:text-5xl">
                Organization is hard because folders are only one opinion.
              </h2>
            </div>
            <div className="grid gap-5 text-lg leading-8 text-muted-foreground">
              <p>
                Renaming, reorganizing, and splitting code can feel impossible when the actual dependencies are hidden behind folder names.
              </p>
              <p>
                CodeGraphy shows the true way your code connects, then gives you graph tools to change that shape until it matches what you need.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
            <div className="grid gap-8 md:grid-cols-[0.8fr_1fr] md:items-end">
              <div>
                <p className="section-kicker-blue mb-3 text-xs font-black uppercase tracking-[0.08em]">How it works</p>
                <h2 className="site-heading text-4xl sm:text-5xl">
                  Code wants to form its own map.
                </h2>
              </div>
              <p className="text-lg leading-8 text-muted-foreground">
                Instead of boxing code into arbitrary human categories, CodeGraphy leans into spatial awareness. Nearby nodes are naturally more relevant to what you are working on, and distant groups show where the system is pulling apart.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {workflowSteps.map(step => {
                const Icon = step.icon;

                return (
                  <Card className="notebook-card mt-8 overflow-hidden" key={step.title}>
                    <img alt="" className="aspect-[16/10] w-full object-cover" src={step.image} />
                    <div className="p-6">
                      <span className="icon-badge mb-5">
                        <Icon size={20} />
                      </span>
                      <h3 className="text-xl font-bold">{step.title}</h3>
                      <p className="mt-2 leading-7 text-muted-foreground">{step.description}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
        </section>

        <section className="section-plain border-y border-border/70" id="gallery">
          <div className="mx-auto max-w-7xl px-5 py-20 md:px-8">
            <p className="section-kicker-orange mb-3 text-xs font-black uppercase tracking-[0.08em]">Gallery</p>
            <h2 className="site-heading max-w-3xl text-4xl sm:text-5xl">
              Useful maps should also be beautiful.
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {galleryItems.map(item => {
                const Icon = item.icon;

                return (
                  <Card className="notebook-card overflow-hidden" key={item.title}>
                    <img alt="" className="aspect-[16/10] w-full object-cover" src={item.image} />
                    <div className="p-5">
                      <div className="mb-3 flex items-center gap-3">
                        <span className="icon-badge">
                          <Icon size={18} />
                        </span>
                        <h3 className="text-xl font-bold">{item.title}</h3>
                      </div>
                      <p className="leading-7 text-muted-foreground">{item.text}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
            <p className="section-kicker-blue mb-3 text-xs font-black uppercase tracking-[0.08em]">Pricing</p>
            <h2 className="site-heading max-w-4xl text-4xl sm:text-5xl">
              One open core. Pro Packages when you need more.
            </h2>
            <Card className="notebook-card mt-8 grid gap-8 p-6 md:grid-cols-[0.72fr_1fr] md:p-8">
              <div>
                <p className="section-kicker-orange text-xs font-black uppercase tracking-[0.08em]">Core</p>
                <h3 className="mt-3 text-3xl font-black">Open-source graph tools</h3>
                <p className="mt-3 leading-7 text-muted-foreground">
                  Install CodeGraphy, index a project, and start moving through code by shape instead of guesswork.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button asChild>
                    <a href={installHref}>
                      <VsCodeIcon />
                      Install CodeGraphy
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={githubHref}>
                      <GitHubIcon />
                      GitHub repo
                    </a>
                  </Button>
                </div>
              </div>
              <ul className="grid gap-3 text-sm text-muted-foreground">
                {coreFeatures.map(feature => (
                  <li className="flex items-start gap-2" key={feature.text}>
                    <feature.icon className="feature-icon mt-0.5 shrink-0" size={16} />
                    {feature.text}
                  </li>
                ))}
              </ul>
            </Card>
            <div className="mt-12 grid gap-3 md:grid-cols-[0.3fr_1fr] md:items-end">
              <div>
                <p className="section-kicker-blue text-xs font-black uppercase tracking-[0.08em]">Pro Packages</p>
                <h3 className="mt-2 text-3xl font-black">Private plugins</h3>
              </div>
            </div>
            <div className="mt-5 grid gap-4">
              {optionalPackages.map(plan => (
                <Card className="notebook-card grid gap-5 p-5 md:grid-cols-[0.28fr_1fr] md:items-start" key={plan.name}>
                  <div>
                    <h3 className="mt-1 text-3xl font-black">{plan.name}</h3>
                    <Button className="mt-4" disabled variant="secondary">
                      Coming soon
                    </Button>
                    <p className="mt-4 leading-7 text-muted-foreground">{plan.description}</p>
                    <p className="mt-3 text-sm font-semibold text-muted-foreground">{plan.price}</p>
                  </div>
                  <div>
                    <ul className="grid gap-2 text-sm text-muted-foreground">
                      {plan.features.map(feature => {
                        const Icon = feature.icon;

                        return (
                          <li className="flex items-start gap-2" key={feature.text}>
                            <Icon className="feature-icon mt-0.5 shrink-0" size={15} />
                            {feature.text}
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {plan.screenshots.map(screenshot => (
                        <figure className="overflow-hidden rounded-md border border-border bg-background" key={screenshot.title}>
                          <img alt="" className="aspect-[16/10] w-full object-cover" src={screenshot.image} />
                          <figcaption className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                            {screenshot.title}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
        </section>

        <section className="section-plain border-y border-border/70" id="faq">
          <div className="mx-auto max-w-7xl px-5 py-20 md:px-8">
            <p className="section-kicker-orange mb-3 text-xs font-black uppercase tracking-[0.08em]">FAQ</p>
            <h2 className="site-heading max-w-4xl text-4xl sm:text-5xl">
              Questions worth answering.
            </h2>
            <div className="mt-8 grid gap-4">
              {faqItems.map(item => (
                <details
                  className="notebook-card group rounded-md border border-border bg-card p-5 text-card-foreground shadow-sm"
                  key={item.question}
                  open={item.defaultOpen}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold">
                    {item.question}
                    <span className="text-2xl leading-none text-muted-foreground transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <FaqAnswer blocks={item.answer} />
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="section-cta">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:grid-cols-[0.9fr_1fr] md:items-center md:px-8">
            <div>
              <p className="section-kicker-orange mb-3 text-xs font-black uppercase tracking-[0.08em]">Start mapping</p>
              <h2 className="site-heading max-w-3xl text-4xl sm:text-5xl">
                Let the graph show you where the code already wants to go.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
                Install the extension for the visual graph, or jump into the open-source repo to explore the CLI, MCP, core, and plugins.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <a href={installHref}>
                    <VsCodeIcon className="h-[18px] w-[18px]" />
                    Install CodeGraphy
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href={githubHref}>
                    <GitHubIcon className="h-[18px] w-[18px]" />
                    GitHub
                  </a>
                </Button>
              </div>
            </div>
            <img
              alt=""
              className="aspect-[16/10] w-full rounded-md border border-border object-cover shadow-sm"
              src="/product-media/large-repo-graph.png"
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
