import Image from 'next/image';

interface PageHeroProps {
  description: string;
  eyebrow: string;
  title: string;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
}

export function PageHero({ actions, aside, description, eyebrow, title }: PageHeroProps): React.ReactElement {
  return (
    <header className="relative isolate overflow-hidden bg-[#061722] px-5 py-20 text-white sm:px-8 sm:py-24 lg:px-12">
      <Image
        alt=""
        aria-hidden="true"
        className="object-cover object-[72%_50%] opacity-45"
        fill
        priority
        sizes="100vw"
        src="/media/ocean-relationship-hero.jpg"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,18,29,.97)_0%,rgba(3,18,29,.86)_47%,rgba(3,18,29,.42)_100%)]" />
      <div aria-hidden="true" className="ocean-grid absolute inset-0 opacity-25" />
      <div className="relative mx-auto grid w-full max-w-[90rem] gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.42fr)] lg:items-end">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#61d8ca]">{eyebrow}</p>
          <h1 className="mt-5 max-w-5xl text-balance text-6xl font-medium leading-[0.9] tracking-[-0.045em] sm:text-7xl lg:text-8xl">{title}</h1>
          <p className="mt-7 max-w-2xl text-pretty text-base leading-7 text-white/65 sm:text-lg">{description}</p>
          {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
        </div>
        {aside ? <div className="rounded-3xl border border-white/12 bg-black/16 p-6 text-sm leading-6 text-white/60 backdrop-blur-md">{aside}</div> : null}
      </div>
    </header>
  );
}
