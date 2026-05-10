/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import React from 'react';

// helpers
import {cn} from '@/lib/utils.ts';

/**
 * Separator orientation options.
 * @default 'horizontal'
 */
export type Orientation = 'horizontal' | 'vertical';

/**
 * Separator line style variants.
 * @default 'solid'
 */
export type SeparatorVariant = 'solid' | 'dashed' | 'dotted';

/**
 * Separator line thickness options.
 * @default 'default'
 */
export type SeparatorSize = 'thin' | 'default' | 'thick';

/**
 * Separator color theme options.
 * @default 'muted'
 */
export type SeparatorColor = 'muted' | 'primary' | 'secondary' | 'accent' | 'destructive';

/**
 * Props for the Separator component.
 *
 * @example
 * ```tsx
 * // Basic horizontal separator
 * <Separator />
 *
 * // Vertical separator
 * <Separator orientation="vertical" className="h-8" />
 *
 * // Separator with label
 * <Separator label="OR" />
 *
 * // Dashed primary-colored thick separator
 * <Separator variant="dashed" color="primary" size="thick" />
 *
 * // Decorative thin separator (hidden from screen readers)
 * <Separator decorative size="thin" />
 *
 * // Vertical separator with label
 * <Separator orientation="vertical" label="OR" className="h-24" />
 * ```
 */
export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Orientation of the separator. @default 'horizontal' */
  orientation?: Orientation;

  /**
   * Whether the separator is purely decorative.
   * When true, the separator is hidden from assistive technology
   * and does not receive `role="separator"` or `aria-orientation`.
   * @default false
   */
  decorative?: boolean;

  /** Optional label rendered in the center of the separator line. */
  label?: React.ReactNode;

  /** Line style variant. @default 'solid' */
  variant?: SeparatorVariant;

  /**
   * Line thickness. `'thin'` uses reduced opacity for a subtle appearance.
   * @default 'default'
   */
  size?: SeparatorSize;

  /** Color theme of the separator line. @default 'muted' */
  color?: SeparatorColor;
}

/* ---------- Internal style maps ---------- */

const variantStyles: Record<SeparatorVariant, string> = {
  solid: 'border-solid',
  dashed: 'border-dashed',
  dotted: 'border-dotted',
};

const sizeStyles: Record<Orientation, Record<SeparatorSize, string>> = {
  horizontal: {
    thin: 'border-t',
    default: 'border-t',
    thick: 'border-t-2',
  },
  vertical: {
    thin: 'border-l',
    default: 'border-l',
    thick: 'border-l-2',
  },
};

const colorStyles: Record<SeparatorColor, string> = {
  muted: 'border-muted',
  primary: 'border-primary',
  secondary: 'border-secondary',
  accent: 'border-accent',
  destructive: 'border-destructive',
};

/* ---------- Component ---------- */

/**
 * A versatile separator component used to visually divide content sections.
 *
 * @remarks
 * - Renders a `<div>` with `role="separator"` for accessibility (when not decorative).
 * - Supports both horizontal and vertical orientations.
 * - Can display an optional label centered within the separator line.
 * - Supports multiple line styles (solid, dashed, dotted), sizes, and color themes.
 * - Always sets `data-orientation` on the root element for external styling hooks.
 * - Vertical separators require a parent with a defined height, or an explicit
 *   height passed via `className` (e.g. `className="h-8"`).
 *
 * @example
 * ```tsx
 * <Separator />
 * <Separator orientation="vertical" className="h-8" />
 * <Separator label="OR" variant="dashed" color="primary" />
 * <Separator size="thick" decorative />
 * ```
 */
const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    {
      orientation = 'horizontal',
      decorative = false,
      label,
      variant = 'solid',
      size = 'default',
      color = 'muted',
      className,
      ...props
    },
    ref,
  ) => {
    const isHorizontal = orientation === 'horizontal';

    /* Accessibility attributes */
    const ariaProps = decorative
      ? ({'aria-hidden': true} as Record<string, unknown>)
      : ({
        role: 'separator' as const,
        'aria-orientation': orientation,
      });

    /* Shared line classes */
    const lineClasses = cn(
      'shrink-0',
      sizeStyles[orientation][size],
      variantStyles[variant],
      colorStyles[color],
      size === 'thin' && 'opacity-50',
    );

    /* ---- Simple separator (no label) ---- */
    if (!label) {
      return (
        <div
          ref={ref}
          data-orientation={orientation}
          {...ariaProps}
          className={cn(
            lineClasses,
            isHorizontal ? 'w-full' : 'h-full',
            className,
          )}
          {...props}
        />
      );
    }

    /* ---- Separator with centered label ---- */
    return (
      <div
        ref={ref}
        data-orientation={orientation}
        {...ariaProps}
        className={cn(
          'flex shrink-0',
          isHorizontal
            ? 'flex-row items-center w-full'
            : 'flex-col items-center h-full',
          className,
        )}
        {...props}
      >
        <div className={cn(lineClasses, 'flex-1')}/>
        <span
          className={cn(
            'shrink-0 text-xs font-medium text-muted-foreground select-none',
            isHorizontal ? 'px-3' : 'py-3',
          )}
        >
          {label}
        </span>
        <div className={cn(lineClasses, 'flex-1')}/>
      </div>
    );
  },
);

Separator.displayName = 'Separator';

export {Separator};
export default Separator;
