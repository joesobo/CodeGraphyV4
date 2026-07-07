import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md text-sm font-semibold transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ),
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        ghost: 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        outline: 'border border-border bg-transparent text-foreground hover:bg-secondary',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3',
        lg: 'h-11 px-5',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  },
);

export interface ButtonProps
  extends ButtonPrimitive.Props,
    VariantProps<typeof buttonVariants> {}

function Button({ className, size, variant, ...props }: ButtonProps): React.ReactElement {
  return <ButtonPrimitive className={cn(buttonVariants({ className, size, variant }))} {...props} />;
}

export { Button, buttonVariants };
