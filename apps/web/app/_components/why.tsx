import {
  Route,
  SmartToy,
  TravelExplore,
  type MaterialSymbolsComponent,
} from '@material-symbols-svg/react/rounded';

const reasons: {
  icon: MaterialSymbolsComponent;
  summary: string;
  title: string;
}[] = [
  {
    icon: TravelExplore,
    title: 'See the whole workspace',
    summary:
      'A bird’s-eye map of every file, folder, package, and the Relationships between them. See where code lives and what a change might touch.',
  },
  {
    icon: Route,
    title: 'Explore code visually',
    summary:
      'Follow imports, references, calls, and inheritance by moving through the Relationship Graph instead of jumping blindly between files.',
  },
  {
    icon: SmartToy,
    title: 'Give agents a map',
    summary:
      'The Agent Skill guides shell-capable agents through bounded CLI Graph Queries, so they can orient before opening files.',
  },
];

export function Why(): React.ReactElement {
  return (
    <section className="w-full bg-[#e7ebf2] px-5 py-24 text-[#17283b] dark:bg-[#0a192a] dark:text-white sm:px-8 sm:py-32 lg:px-12">
      <div className="mx-auto max-w-[90rem]">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-medium leading-[1.02] sm:text-6xl">
            Code was never a list of folders.
          </h2>
          <p className="mt-7 text-base leading-7 text-[#526276] dark:text-white/72 sm:text-lg">
            CodeGraphy started with a simple frustration: editors organize code as folders nested
            inside folders, a flat list pretending to be structure. The real structure is the web
            of imports, references, and calls underneath. A file tree cannot show it. Lay a
            CodeGraphy Workspace out as a Relationship Graph and it organizes itself: islands
            appear, and clusters form around files that actually belong together.
          </p>
          <p className="mt-4 text-base leading-7 text-[#526276] dark:text-white/72 sm:text-lg">
            CodeGraphy is local by default. Indexing runs in your CodeGraphy Workspace and
            writes a Graph Cache on disk, so editors and agents reuse local structure instead of
            uploading source code to a hosted graph service.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-6xl gap-6 border-t border-[#17283b]/12 pt-10 text-left dark:border-white/12 sm:grid-cols-3">
          {reasons.map((reason) => (
            <div key={reason.title}>
              <span className="flex size-11 items-center justify-center rounded-full bg-[#f2f1eb] text-[#2859b5] dark:bg-white/8 dark:text-[#88b1ff]">
                <reason.icon aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{reason.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{reason.summary}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
