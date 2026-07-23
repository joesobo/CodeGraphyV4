import { cn } from '@/lib/utils';

interface IconProps {
  src: string;
  className?: string;
  variant?: 'color' | 'mono';
}

export function Icon({
  src,
  className,
  variant = 'color',
}: IconProps): React.ReactElement {
  const imageUrl = `url("${src}")`;

  if (variant === 'mono') {
    const mask = `${imageUrl} center / contain no-repeat`;

    return (
      <span
        aria-hidden="true"
        className={cn('block shrink-0 bg-current', className)}
        style={{
          mask,
          WebkitMask: mask,
        }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn('block bg-contain bg-center bg-no-repeat', className)}
      style={{ backgroundImage: imageUrl }}
    />
  );
}
