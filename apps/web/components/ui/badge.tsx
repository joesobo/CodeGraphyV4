import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, ReactElement } from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        outline: 'text-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface BadgeProps
  extends ComponentProps<'span'>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps): ReactElement {
  return <span className={cn(badgeVariants({ variant }), className)} data-slot="badge" {...props} />;
}

export { Badge, badgeVariants };
