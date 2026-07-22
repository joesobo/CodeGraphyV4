import { Icon } from '@/components/icon';
import { Link } from '@/components/link';
import { SectionHeader } from '@/components/section-header';
import { exampleContent } from '@/content/examples';

export function SupportedLanguages(): React.ReactElement {
  return (
    <section className="mx-auto grid w-full max-w-[90rem] gap-8 px-5 sm:px-8 lg:px-12" id="language-coverage">
      <div>
        <p className="section-kicker mb-4 text-primary">Language coverage</p>
        <SectionHeader
          title="A wide surface area, one consistent graph."
          description="Core ships broad baseline language coverage. Plugins add deeper, ecosystem-specific meaning where syntax alone is not enough."
        />
      </div>
      <ul
        aria-label="Supported languages and project types"
        className="grid grid-cols-2 border-r border-b border-border sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6"
      >
        {exampleContent.map((example) => (
          <li className="min-w-0" key={example.id}>
            <Link
              aria-label={`Open ${example.name} example`}
              className="flex min-h-14 min-w-0 items-center gap-2 border-t border-l border-border px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:relative focus-visible:z-10 sm:min-h-16 sm:gap-3 sm:px-4 sm:text-sm"
              href={example.href}
            >
              <Icon
                className="size-4.5 shrink-0 text-primary sm:size-5"
                src={example.iconUrl}
                variant="mono"
              />
              <span className="min-w-0 whitespace-nowrap">{example.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
