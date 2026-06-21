import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        success: 'bg-success text-success-foreground hover:bg-success/90',
        warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      // Heights of `default`/`sm`/`icon` are token-scoped so the shared
      // landing/auth shells keep their original size; the app gets compact.
      size: {
        default: 'h-[var(--control-h)] px-4 py-2',
        md: 'h-9 px-4 py-2',
        xs: 'h-7 rounded-md px-2 text-xs',
        sm: 'h-[var(--control-h-sm)] rounded-md px-3',
        lg: 'h-10 rounded-md px-6',
        icon: 'h-[var(--control-h)] w-[var(--control-h)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type LegacyButtonColor =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'ghost'
  | 'link'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

const legacyColorToVariant = (
  color?: LegacyButtonColor,
  variant?: ButtonProps['variant']
): ButtonProps['variant'] => {
  if (variant) {
    return variant;
  }

  switch (color) {
    case 'secondary':
      return 'secondary';
    case 'ghost':
      return 'ghost';
    case 'link':
      return 'link';
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'destructive';
    default:
      return 'default';
  }
};

export interface ButtonProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  children?: React.ReactNode;
  color?: LegacyButtonColor;
  loading?: boolean;
  active?: boolean;
  fullWidth?: boolean;
  wide?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      children,
      color,
      loading,
      active: _active,
      fullWidth,
      wide,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const resolvedVariant = legacyColorToVariant(color, variant);
    return (
      <Comp
        className={cn(
          buttonVariants({ variant: resolvedVariant, size, className }),
          (fullWidth || wide) && 'w-full'
        )}
        aria-busy={loading || undefined}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
