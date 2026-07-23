import { CopyButton } from '@/components/copy-button';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  children: string;
  className?: string;
}

/** Command block with a built-in copy-to-clipboard button. */
export function CodeBlock({ children, className }: CodeBlockProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-muted p-3 font-mono text-sm leading-6',
        className,
      )}
    >
      <pre className="min-w-0 flex-1 overflow-x-auto text-foreground">
        <code>{children}</code>
      </pre>
      <CopyButton className="shrink-0" text={children} />
    </div>
  );
}
