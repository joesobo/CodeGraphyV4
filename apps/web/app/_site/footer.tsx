export function SiteFooter(): React.ReactElement {
  return (
    <footer className="border-t border-border/70 px-5 py-8 text-sm text-muted-foreground md:px-8" data-force-field-section="true">
      <div className="force-field-content mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>CodeGraphy</span>
        <span>Visualize your code's connections.</span>
      </div>
    </footer>
  );
}
