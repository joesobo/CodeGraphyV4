import { Button } from '../_ui/button';
import { Card } from '../_ui/card';
import { GitHubIcon, VsCodeIcon } from '../_ui/icons';
import { SiteFooter } from '../_site/footer';
import { SiteHeader } from '../_site/header';
import {
  faqItems,
  githubHref,
  installHref,
  optionalPackages,
  socialProofItems,
  supportedLanguages,
  workflowSteps,
} from './content';
import { FeatureTour } from './featureTour/view';
import { ForceNodeControls } from './forceNodeField/controls';
import { ForceNodeSettingsProvider } from './forceNodeField/settings';
import { ForceNodeField } from './forceNodeField/view';
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

function SupportedLanguageIcon({
  iconPath,
}: {
  iconPath: string;
}): React.ReactElement {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path d={iconPath} fill="currentColor" />
    </svg>
  );
}

function SupportedLanguageMarquee(): React.ReactElement {
  const languageRows = [supportedLanguages, supportedLanguages];

  return (
    <div className="mt-8 border-t border-border pt-6">
      <p className="section-kicker-blue text-xs font-black uppercase">Supported languages</p>
      <div aria-label="Supported language examples" className="language-marquee mt-4">
        <div className="language-marquee-track">
          {languageRows.map((languages, rowIndex) => (
            <div className="language-marquee-group" key={`language-row-${rowIndex}`}>
              {languages.map(language => (
                <a
                  aria-label={`${language.label} example`}
                  className="language-icon-link"
                  href={language.exampleHref}
                  key={`${rowIndex}-${language.label}`}
                  rel="noreferrer"
                  target="_blank"
                  title={`${language.label} example`}
                >
                  <SupportedLanguageIcon iconPath={language.icon.path} />
                  <span className="sr-only">{language.label}</span>
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HomeView(): React.ReactElement {
  return (
    <>
      <SiteHeader />
      <div className="force-field-page">
        <ForceNodeSettingsProvider>
        <ForceNodeField />
        <main>
        <section className="relative overflow-hidden" data-force-field-section="true">
          <div className="force-field-background home-hero-overlay absolute inset-0" />
          <div className="force-field-content mx-auto grid min-h-[720px] max-w-7xl items-end gap-10 px-5 pb-20 pt-28 md:grid-cols-[0.9fr_0.7fr] md:px-8">
            <div className="max-w-3xl">
              <h1 className="site-heading text-5xl leading-[0.95] text-foreground sm:text-7xl lg:text-8xl">
                See your code connect.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                CodeGraphy turns a codebase into a visual graph, allowing you to navigate, understand, and change your code by its actual shape instead of hidden folder structures.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <a href={installHref}>
                    <VsCodeIcon className="h-[18px] w-[18px]" />
                    Install CodeGraphy
                  </a>
                </Button>
              </div>
              <a
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-foreground underline-offset-4 hover:underline"
                href={githubHref}
                rel="noreferrer"
                target="_blank"
              >
                <GitHubIcon className="h-4 w-4" />
                Open source on GitHub
              </a>
            </div>
            <ForceNodeControls />
          </div>
        </section>

        <section data-force-field-section="true">
          <div className="force-field-content mx-auto grid max-w-7xl gap-10 px-5 py-20 md:grid-cols-[0.8fr_1fr] md:px-8">
            <div>
              <p className="section-kicker-blue mb-3 text-xs font-black uppercase">Problem</p>
              <h2 className="site-heading text-4xl sm:text-5xl">
                Codebases drift faster than folders can explain them.
              </h2>
            </div>
            <div className="grid gap-5 text-lg leading-8 text-muted-foreground">
              <p>
                Renaming, splitting, and reorganizing code gets risky when the real dependencies are buried across imports, symbols, packages, and plugin conventions.
              </p>
              <p>
                CodeGraphy shows the shape that already exists, so you can change structure with more confidence.
              </p>
            </div>
          </div>
        </section>

        <section className="section-plain border-y border-border/70" id="gallery">
          <div className="mx-auto max-w-7xl px-5 py-14 md:px-8">
            <div className="border-b border-border pb-4">
              <h2 className="site-heading max-w-3xl text-4xl sm:text-[3rem]">
                Features.
              </h2>
            </div>
            <FeatureTour />
            <SupportedLanguageMarquee />
          </div>
        </section>

        <section data-force-field-section="true">
          <div className="force-field-content mx-auto max-w-7xl px-5 py-20 md:px-8">
            <div className="grid gap-8 md:grid-cols-[0.8fr_1fr] md:items-end">
              <div>
                <p className="section-kicker-blue mb-3 text-xs font-black uppercase">Example graphs</p>
                <h2 className="site-heading text-4xl sm:text-5xl">
                  Open repos from above.
                </h2>
              </div>
              <p className="text-lg leading-8 text-muted-foreground">
                Explore any repo with CodeGraphy to see the real shape of the code. Below are graphs of popular open source projects created by the community.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {socialProofItems.map(item => {
                const Icon = item.icon;

                return (
                  <Card className="notebook-card overflow-hidden" key={item.title}>
                    <img alt="" className="aspect-[16/10] w-full object-cover" src={item.image} />
                    <div className="flex items-center justify-between gap-3 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="icon-badge shrink-0">
                          <Icon size={18} />
                        </span>
                        <h3 className="truncate text-xl font-bold">{item.title}</h3>
                      </div>
                      <a
                        className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-bold text-foreground transition-colors hover:border-[hsl(var(--brand-blue))] hover:text-[hsl(var(--brand-blue))]"
                        href={item.href}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <GitHubIcon className="h-4 w-4" />
                        View repo
                      </a>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section-plain border-y border-border/70">
          <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
            <div className="grid gap-8 md:grid-cols-[0.8fr_1fr] md:items-end">
              <div>
                <p className="section-kicker-blue mb-3 text-xs font-black uppercase">How it works</p>
                <h2 className="site-heading text-4xl sm:text-5xl">
                  Code wants to form its own connections.
                </h2>
              </div>
              <p className="text-lg leading-8 text-muted-foreground">
                Instead of arbitrary categories, CodeGraphy leans into spatial awareness. Nearby nodes are naturally more relevant to what you are working on, and distant groups show where systems are pulling apart internally.
              </p>
            </div>
            <div className="workflow-studio mt-8 grid gap-4 p-4 lg:grid-cols-[1.05fr_0.75fr]">
              <div className="overflow-hidden rounded-md border border-border bg-background">
                <img alt="" className="aspect-[16/8] w-full object-cover" src="/product-media/codegraphy-architecture.png" />
                <div className="border-t border-border p-4">
                  <p className="section-kicker-blue mb-2 text-xs font-black uppercase">Local relationship map</p>
                  <p className="leading-6 text-muted-foreground">
                    CodeGraphy can show you only the code relevant to your current work, and the relationships between them, without needing to understand the whole codebase at once.
                  </p>
                </div>
              </div>
              <div className="grid gap-3">
                {workflowSteps.map(step => {
                  const Icon = step.icon;

                  return (
                    <div className="hero-tool-row bg-card px-4 py-4" key={step.title}>
                      <span className="icon-badge">
                        <Icon size={18} />
                      </span>
                      <div>
                        <h3 className="font-bold text-foreground">{step.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section data-force-field-section="true">
          <div className="force-field-content mx-auto max-w-7xl px-5 py-20 md:px-8">
            <p className="section-kicker-blue mb-3 text-xs font-black uppercase">Private plugins</p>
            <h2 className="site-heading max-w-4xl text-4xl sm:text-5xl">
              Paid plugins for focused workflows.
            </h2>
						<p className="max-w-3xl leading-7 text-muted-foreground mt-2">
							Private plugins are optional monthly plugins layered on top of the open core.
						</p>
            <div className="mt-5 grid gap-4">
              {optionalPackages.map(plan => (
                <Card className="notebook-card grid gap-5 p-5 md:grid-cols-[0.28fr_1fr] md:items-start" key={plan.name}>
                  <div>
                    <h3 className="mt-1 text-3xl font-black">{plan.name}</h3>
                    <p className="mt-4 leading-7 text-muted-foreground">{plan.description}</p>
                    <Button className="mt-4" disabled variant="secondary">
                      Coming soon
                    </Button>
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
          </div>
        </section>

        <section className="section-plain border-y border-border/70" id="faq">
          <div className="mx-auto max-w-7xl px-5 py-20 md:px-8">
            <p className="section-kicker-blue mb-3 text-xs font-black uppercase">FAQ</p>
            <h2 className="site-heading max-w-4xl text-4xl sm:text-5xl">
              Questions worth answering.
            </h2>
            <div className="mt-8 grid gap-4">
              {faqItems.map(item => (
                <details
                  className="notebook-card group rounded-md border border-border bg-card p-5 text-card-foreground shadow-sm"
                  key={item.question}
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

        <section className="section-cta relative overflow-hidden" data-force-field-section="true">
          <div className="force-field-background home-hero-overlay section-cta-overlay absolute inset-0" />
          <div className="force-field-content mx-auto grid max-w-7xl gap-8 px-5 py-14 md:grid-cols-[1fr_0.72fr] md:items-center md:px-8 md:py-16">
            <div className="max-w-3xl">
              <p className="section-kicker-blue mb-3 text-xs font-black uppercase">Start graphing</p>
              <h2 className="site-heading max-w-2xl text-3xl sm:text-4xl">
                Map the repo in front of you.
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
                Install the extension, open a project, and see the connections already inside the code.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild>
                  <a href={installHref}>
                    <VsCodeIcon className="h-[18px] w-[18px]" />
                    Install CodeGraphy
                  </a>
                </Button>
              </div>
            </div>
            <div className="section-cta-graph-window md:ml-auto md:w-full md:max-w-[34rem]">
              <img
                alt=""
                className="aspect-[16/9] h-full w-full object-cover"
                src="/product-media/large-repo-graph.png"
              />
            </div>
          </div>
        </section>
          </main>
          <SiteFooter />
        </ForceNodeSettingsProvider>
      </div>
    </>
  );
}
