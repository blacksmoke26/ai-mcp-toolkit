/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

export const CATEGORY_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-fuchsia-500',
  'bg-lime-500',
  'bg-orange-500',
  'bg-sky-500',
];

/**
 * Retrieves a color class from the predefined palette based on an index.
 * This ensures consistent coloring across the UI by cycling through the
 * `CATEGORY_COLORS` array using modulo arithmetic.
 *
 * @param i - The index used to select the color.
 * @returns The Tailwind CSS class string for the selected color.
 */
export const getColorForIndex = (i: number): string => CATEGORY_COLORS[i % CATEGORY_COLORS.length];
