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
    <div className={cn('max-w-3xl', className)}>
      <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
      {description ? (
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
