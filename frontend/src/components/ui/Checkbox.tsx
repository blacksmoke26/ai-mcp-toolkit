/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import React from 'react';
import {cn} from '@/lib/utils';

/**
 * Properties for the Checkbox component.
 * Extends standard HTML input attributes for checkboxes.
 */
export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * The checked state of the checkbox.
   * @default false
   */
  checked?: boolean;
  /**
   * Callback function invoked when the checked state changes.
   * @param checked - The new checked state.
   */
  onCheckedChange?(checked: boolean): void;
}

/**
 * Checkbox component for selection controls
 * @example
 * <Checkbox checked={true} onCheckedChange={(checked) => console.log(checked)} />
 * @developer
 * Uses a checkbox input hidden visually but accessible to screen readers
 * and a styled checkmark that appears when checked
 */
export const Checkbox: React.FC<CheckboxProps> = ({className, checked, onCheckedChange, ...props}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onCheckedChange) {
      onCheckedChange(event.target.checked);
    }
  };

  return (
    <div
      className={cn('relative inline-flex items-center justify-center w-4 h-4 rounded-sm border border-input ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        className="sr-only"
        {...props}
      />
      <div className={cn(
        'flex items-center justify-center w-4 h-4 rounded-sm border border-input',
        'peer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'transition-colors duration-200 ease-in-out',
        checked ? 'bg-primary text-primary-foreground' : 'bg-background',
      )}>
        {checked && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
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
