import { Link } from '@/components/link';
import { docsHref, homeHref, examplesHref } from '@/content/links';

export default function NotFound(): React.ReactElement {
  return (
    <section className="mx-auto grid min-h-[70svh] w-full min-w-0 max-w-384 place-items-center px-5 py-20 sm:px-8 lg:px-12">
      <div className="w-full min-w-0 max-w-4xl py-14 text-center">
        <span aria-hidden="true" className="codegraphy-symbol text-5xl text-muted-foreground" />
        <p className="mt-8 font-mono text-xs text-muted-foreground">404 · unresolved edge</p>
        <h1 className="home-display mt-4 min-w-0 [overflow-wrap:anywhere] text-5xl leading-none sm:text-8xl">
          Relationship not found.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground">This path leaves the public graph.</p>
        <nav aria-label="Recovery links" className="mt-9 flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm font-semibold">
          <Link href={homeHref}>Home</Link>
          <Link href={docsHref}>Docs</Link>
          <Link href={examplesHref}>Examples</Link>
        </nav>
      </div>
    </section>
  );
}
