import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description: string;
  className?: string;
}

export function PageHeader({
  title,
  description,
  className,
}: PageHeaderProps): React.ReactElement {
  return (
    <div className={className}>
      <h1 className="max-w-4xl text-balance text-5xl font-medium leading-[0.98] sm:text-6xl lg:text-7xl">
        {title}
      </h1>
      <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
        {description}
      </p>
    </div>
  );
}

/** Row of action buttons composed directly below a PageHeader. */
export function PageHeaderActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return <div className={cn('mt-8 flex flex-wrap gap-3', className)}>{children}</div>;
}
