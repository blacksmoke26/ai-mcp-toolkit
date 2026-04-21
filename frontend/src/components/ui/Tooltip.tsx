/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import {cn} from '@/lib/utils';

/**
 * TooltipProvider wraps the application to provide tooltip context.
 * It ensures that tooltips are rendered correctly and managed globally.
 */
const TooltipProvider = TooltipPrimitive.Provider;

/**
 * Tooltip is the root component that controls the visibility and state of the tooltip.
 * It combines the trigger and content components to create a functional tooltip.
 */
const Tooltip = TooltipPrimitive.Root;

/**
 * TooltipTrigger is the element that triggers the tooltip when hovered or focused.
 * It wraps the target element (e.g., a button or icon) that activates the tooltip.
 */
const TooltipTrigger = TooltipPrimitive.Trigger;

/**
 * TooltipContent is the actual content displayed inside the tooltip.
 * It supports custom styling, positioning, and animations.
 *
 * @param {string} [className] - Additional CSS class names to apply to the tooltip content.
 * @param {number} [sideOffset=4] - The distance in pixels between the tooltip and the trigger element.
 * @param {React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>} props - Additional props from Radix UI's TooltipPrimitive.Content.
 * @param {React.RefObject<HTMLElement>} ref - A ref to the underlying DOM element.
 */
const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({className, sideOffset = 4, ...props}, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className,
    )}
    {...props}
  />
));

TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/**
 * TooltipPortal renders the tooltip content outside the main DOM hierarchy.
 * This ensures proper z-index stacking and prevents clipping issues.
 */
const TooltipPortal = TooltipPrimitive.Portal;

export {Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipPortal};
