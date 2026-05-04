/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import React, {useRef} from 'react';
import {cn} from '@/lib/utils';

/**
 * Properties for the Checkbox component.
 * Extends standard HTML input attributes for checkboxes.
 */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'checked'> {
  /**
   * The checked state of the checkbox.
   * @default false
   */
  checked?: boolean;
  /**
   * Callback function invoked when the checked state changes.
   * @param checked - The new checked state.
   */
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * Checkbox component for selection controls
 * @example
 * <Checkbox checked={true} onCheckedChange={(checked) => console.log(checked)} />
 * @developer
 * Uses a checkbox input hidden visually but accessible to screen readers
 * and a styled checkmark that appears when checked
 */
export const Checkbox: React.FC<CheckboxProps> = ({className, checked, onCheckedChange, disabled, ...props}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Prevent focus loss and ensure proper pointer capture
    e.preventDefault();
  };

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    // Toggle the checkbox by clicking the hidden input
    const input = inputRef.current;
    if (input) {
      const newState = !input.checked;
      input.checked = newState;
      input.dispatchEvent(new Event('change', {bubbles: true}));
      onCheckedChange?.(newState);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      e.stopPropagation();
      const input = inputRef.current;
      if (input) {
        const newState = !input.checked;
        input.checked = newState;
        input.dispatchEvent(new Event('change', {bubbles: true}));
        onCheckedChange?.(newState);
      }
    }
  };

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center w-4 h-4 rounded-sm border border-input ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 select-none',
        disabled && 'cursor-not-allowed opacity-50',
        !disabled && 'cursor-pointer',
        className,
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? undefined : 0}
      role="checkbox"
      aria-checked={checked || false}
      aria-disabled={disabled || false}
      aria-label={props['aria-label'] || 'Checkbox'}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked || false}
        onChange={(e) => {
          onCheckedChange?.(e.target.checked);
        }}
        disabled={disabled}
        className="sr-only absolute inset-0 w-4 h-4 opacity-0 cursor-pointer"
        {...props}
      />
      <div
        className={cn(
          'flex items-center justify-center w-4 h-4 rounded-sm border border-input pointer-events-none',
          'transition-colors duration-200 ease-in-out',
          checked ? 'bg-primary text-primary-foreground' : 'bg-background',
        )}
      >
        {checked && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-3"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )}
      </div>
    </div>
  );
};
