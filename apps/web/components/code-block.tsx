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
        'flex items-center justify-between gap-3 rounded-md border border-border bg-muted p-3 font-mono text-sm leading-6',
        className,
      )}
    >
      <pre className="overflow-x-auto text-foreground">
        <code>{children}</code>
      </pre>
      <CopyButton text={children} />
    </div>
  );
}
