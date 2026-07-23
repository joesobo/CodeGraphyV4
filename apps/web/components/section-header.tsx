import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  className,
}: SectionHeaderProps): React.ReactElement {
  return (
    <div className={cn('w-full min-w-0 max-w-3xl', className)}>
      <h2 className="text-balance text-4xl font-medium leading-[1.04] sm:text-5xl">{title}</h2>
      {description ? (
        <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
