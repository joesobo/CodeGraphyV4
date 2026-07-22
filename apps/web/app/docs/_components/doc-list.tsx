import { Icon } from '@/components/icon';
import { Link } from '@/components/link';
import { SectionHeader } from '@/components/section-header';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { docsGroups } from '@/content/docs';

export function DocList(): React.ReactElement {
  return (
    <section className="grid gap-16">
      <SectionHeader title="Documentation that stays close to the code." description="Start with the product guides, move into the Core CLI or Agent Skill, then go as deep as the Plugin contracts require." />

      {docsGroups.map((group) => (
        <div className="grid gap-6 border-t border-border pt-8" key={group.title}>
          <div>
            <h3 className="text-3xl font-medium">{group.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{group.summary}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.links.map((link) => (
              <Link className="group" href={link.href} id={link.id} key={link.href}>
                <Card as="article" className="h-full rounded-3xl bg-card/75 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md" interactive>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-1.5 text-xl">
                      {link.title}
                      <Icon
                        className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary"
                        src="/icons/github.svg"
                        variant="mono"
                      />
                    </CardTitle>
                    <CardDescription className="mt-1">{link.summary}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
