'use client';

import { CopyButton } from '@/components/copy-button';
import { Liquid } from '@/components/canvasui/Liquid';
import { Link } from '@/components/link';
import { ThemeHeroImage } from '@/components/theme-hero-image';
import { buttonVariants } from '@/components/ui/button';
import { examplesHref, githubHref, vscodeExtensionHref } from '@/content/links';
import { cn } from '@/lib/utils';
import { useRef } from 'react';
import { HeroGraph } from './hero-graph';

export function Header(): React.ReactElement {
  const heroRef = useRef<HTMLElement>(null);

  return (
    <section
      className="home-hero relative isolate overflow-hidden bg-[#061722] text-white"
      ref={heroRef}
    >
      <ThemeHeroImage
        alt="Underwater ocean scene"
        darkSrc="/media/ocean-home-depth-v5.jpg"
        lightSrc="/media/ocean-home-surface-v4.jpg"
      />
      <Liquid
        blend={0}
        className="absolute inset-0"
        color={[1, 1, 1]}
        curl={9.1}
        densityDissipation={0.915}
        distortion={1.55}
        force={1.5}
        intensity={0.9}
        interactionTargetRef={heroRef}
        pressure={0.2}
        pressureIterations={9}
        radius={0.5}
        rainbow={false}
        style={{ position: 'absolute' }}
        velocityDissipation={0.905}
      >
        <ThemeHeroImage
          alt=""
          darkSrc="/media/ocean-home-depth-v5.jpg"
          lightSrc="/media/ocean-home-surface-v4.jpg"
        />
      </Liquid>
      <HeroGraph />

      <div className="relative z-10 mx-auto grid min-h-[44rem] w-full max-w-[90rem] items-end gap-10 px-5 pt-32 pb-10 sm:min-h-[46rem] sm:px-8 sm:pb-14 lg:min-h-svh lg:grid-cols-[minmax(0,1.08fr)_minmax(30rem,.72fr)] lg:gap-12 lg:px-12 lg:pb-16">
        <div className="hero-copy max-w-5xl">
          <h1 className="max-w-5xl text-balance text-[clamp(3.65rem,7vw,7.6rem)] font-medium leading-[0.91] tracking-[-0.045em]">
            Understand the code <em className="font-normal text-[#88b1ff]">beneath</em> the surface.
          </h1>
        </div>

        <div className="hero-aside w-full max-w-xl lg:justify-self-end">
          <p className="max-w-[36rem] text-pretty text-base leading-7 text-white/94 sm:text-lg sm:leading-8">
            CodeGraphy is a local, interactive Relationship Graph for files, symbols,
            packages, and their connections, so you can see how a workspace actually fits together.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 lg:flex-nowrap">
            <Link
              className={cn(buttonVariants({ size: 'lg' }), 'install-cta')}
              href={vscodeExtensionHref}
              icon="vscode"
            >
              Install in VS Code
            </Link>
            <Link
              className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'border-white/22 bg-white/6 text-white hover:border-white/40 hover:bg-white/12')}
              href={githubHref}
              icon="github"
            >
              Explore the source
            </Link>
          </div>
          <div className="hero-console mt-8" aria-label="CodeGraphy command preview">
            <div className="hero-console-command">
              <code><span>$</span> npm i -g @codegraphy-dev/core</code>
              <CopyButton
                className="text-white/80 hover:bg-white/8 hover:text-white"
                text="npm i -g @codegraphy-dev/core"
              />
            </div>
            <Link href={examplesHref}>View examples <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
