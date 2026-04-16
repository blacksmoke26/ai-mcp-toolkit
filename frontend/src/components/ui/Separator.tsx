/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import React from 'react';

// helpers
import { cn } from '@/lib/utils.ts';

/**
 * Separator component used to divide content.
 *
 * @remarks
 * The component renders a simple `<hr>` element with default styling.
 * It accepts an optional `className` to allow custom styling.
 *
 * @example
 * ```tsx
 * <Separator className="my-4" />
 * ```
 */
export interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
  /** Additional class names to apply to the separator. */
  className?: string;
}

export const Separator: React.FC<SeparatorProps> = ({ className, ...props }) => (
  <hr
    className={cn('my-4 border-t border-muted', className)}
    {...props}
  />
);

export default Separator;
