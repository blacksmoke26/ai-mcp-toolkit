/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
*/

import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '@/lib/utils';

/**
 * Available visual style variants for the Button component.
 */
export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'plain' | 'gradient';

/**
 * Available size presets for the Button component.
 */
export type ButtonSize = 'default' | 'sm' | 'lg' | 'xs' | 'icon';

const variant: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  plain: 'bg-transparent hover:bg-transparent shadow-none',
  link: 'text-primary underline-offset-4 hover:underline shadow-none',
  gradient: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 shadow-md border-0',
};

const size: Record<ButtonSize, string> = {
  default: 'h-10 px-4 py-2 text-sm',
  sm: 'h-9 rounded-md px-3 text-xs',
  lg: 'h-11 rounded-md px-8 text-base',
  xs: 'h-8 w-8 p-0 text-xs', // Useful for small icon buttons
  icon: 'h-10 w-10 p-0',
};

/**
 * Configuration for button styles using class-variance-authority (CVA).
 * Defines the base classes and variant mappings for the component.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant,
      size,
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

/**
 * Props for the Button component.
 * Extends standard HTML button attributes and variant props.
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Whether to merge props with the child element instead of rendering a button */
  asChild?: boolean;
}

/**
 * Button component with various variants and sizes.
 * Supports forwarding refs and polymorphic `asChild` behavior.
 *
 * @example
 * // Basic usage
 * <Button>Click me</Button>
 *
 * @example
 * // With variant
 * <Button variant="destructive">Delete</Button>
 *
 * @example
 * // With size
 * <Button size="lg">Large Button</Button>
 *
 * @example
 * // As a link (using asChild)
 * <Button asChild>
 *   <a href="/login">Log in</a>
 * </Button>
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({className, variant, size, asChild = false, ...props}, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({variant, size, className}))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
