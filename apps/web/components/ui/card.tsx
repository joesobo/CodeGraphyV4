import * as React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'article' | 'aside' | 'div' | 'li' | 'section';
  /** Site-wide hover treatment for cards that act as links. */
  interactive?: boolean;
}

function Card({
  as: Component = 'div',
  className,
  interactive,
  ...props
}: CardProps): React.ReactElement {
  return (
    <Component
      className={cn(
        'rounded-md border border-border bg-card text-card-foreground shadow-sm',
        interactive && 'transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-md',
        className,
      )}
      data-slot="card"
      {...props}
    />
  );
}

function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('flex flex-col gap-1.5 p-5', className)} data-slot="card-header" {...props} />;
}

function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>): React.ReactElement {
  return <h3 className={cn('text-base font-semibold', className)} data-slot="card-title" {...props} />;
}

function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>): React.ReactElement {
  return (
    <p
      className={cn('text-sm leading-6 text-muted-foreground', className)}
      data-slot="card-description"
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('p-5 pt-0', className)} data-slot="card-content" {...props} />;
}

function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('flex items-center p-5 pt-0', className)} data-slot="card-footer" {...props} />;
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
