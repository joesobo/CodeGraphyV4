import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-full text-sm font-semibold transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ),
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md',
        ghost: 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
        outline: 'border border-border bg-background/60 text-foreground backdrop-blur-sm hover:-translate-y-0.5 hover:border-primary/50 hover:bg-secondary/80',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3',
        lg: 'h-12 px-6',
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
