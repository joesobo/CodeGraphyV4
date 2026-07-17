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
      'A bird’s-eye map of every file, folder, and package — and the Relationships between them. Stop guessing where things live or what a change might touch.',
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
      'Agents use the CodeGraphy CLI and Agent Skill to query the same Graph Cache — without reading every file just to understand the structure.',
  },
];

export function Why(): React.ReactElement {
  return (
    <section className="w-full border-y border-primary/15 bg-primary/10 px-6 py-16 sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Code was never a list of folders.
          </h2>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            CodeGraphy started with a simple frustration: editors organize code as folders nested
            inside folders, a flat list pretending to be structure. The real structure is the web
            of imports, references, and calls underneath — and a file tree cannot show it. Lay a
            CodeGraphy Workspace out as a Relationship Graph and it organizes itself: islands
            appear, and clusters form around files that actually belong together.
          </p>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            CodeGraphy is local first by default: Indexing runs in your CodeGraphy Workspace and
            writes a Graph Cache on disk, so editors and agents reuse local structure instead of
            uploading source code to a hosted graph service.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-10 border-t border-primary/15 pt-10 text-left sm:grid-cols-3">
          {reasons.map((reason) => (
            <div key={reason.title}>
              <span className="flex size-11 items-center justify-center rounded-lg bg-background text-primary">
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
