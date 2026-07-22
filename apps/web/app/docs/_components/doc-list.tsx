import { Link } from '@/components/link';
import { SectionHeader } from '@/components/section-header';
import { docsGroups } from '@/content/docs';

export function DocList(): React.ReactElement {
  return (
    <section className="grid gap-16">
      <SectionHeader title="Documentation that stays close to the code." description="Start with the product guides, move into the Core CLI or Agent Skill, then go as deep as the Plugin contracts require." />

      {docsGroups.map((group, groupIndex) => (
        <section
          className="grid gap-8 border-t border-border pt-8 lg:grid-cols-[minmax(15rem,.42fr)_minmax(0,1fr)] lg:gap-16"
          key={group.title}
        >
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="font-mono text-xs font-semibold tracking-[0.18em] text-primary">
              {String(groupIndex + 1).padStart(2, '0')}
            </p>
            <h3 className="mt-3 text-3xl font-medium">{group.title}</h3>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{group.summary}</p>
          </div>

          <div className="divide-y divide-border border-y border-border">
            {group.links.map((link, linkIndex) => (
              <Link
                className="group grid gap-3 py-5 transition-colors hover:bg-secondary/35 focus-visible:bg-secondary/35 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-start sm:px-4"
                href={link.href}
                id={link.id}
                key={link.href}
              >
                <span className="font-mono text-[0.68rem] font-semibold text-muted-foreground/70">
                  {String(linkIndex + 1).padStart(2, '0')}
                </span>
                <span>
                  <span className="block text-xl font-medium tracking-[-0.02em] text-foreground">{link.title}</span>
                  <span className="mt-1 block max-w-2xl text-sm leading-6 text-muted-foreground">{link.summary}</span>
                </span>
                <span aria-hidden="true" className="text-xl text-primary transition-transform duration-200 group-hover:translate-x-1">↗</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
