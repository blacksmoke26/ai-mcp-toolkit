/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {BarChart3} from 'lucide-react';
import React from 'react';
import {cn} from '@/lib/utils';
import {getColorForIndex} from './utils';
import type {Stats} from './types';

/**
 * Props for the CategoryChart component.
 */
export interface CategoryChartProps {
  /** The statistics object containing category distribution data. */
  stats: Stats;
}

/**
 * Simple category bar-chart widget.
 * Visualizes the distribution of templates across different categories
 * using horizontal bars with colors corresponding to the category index.
 */
const CategoryChart: React.FC<CategoryChartProps> = ({stats}) => {
  /** Sorted array of [category, count] tuples, descending by count. */
  const cats = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
  /** The maximum count value, used to calculate bar width percentages. */
  const max = Math.max(...cats.map(([, v]) => v), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground"/>
        <span className="text-sm font-medium">By Category</span>
      </div>
      {cats.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data</p>
      ) : (
        <div className="space-y-1.5">
          {cats.map(([cat, count], idx) => (
            <div key={cat} className="flex items-center gap-2">
              <div
                className={cn('h-3 w-3 rounded-full', getColorForIndex(idx))}
              />
              <span className="text-xs w-24 truncate text-muted-foreground">{cat}</span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    getColorForIndex(idx),
                  )}
                  style={{width: `${(count / max) * 100}%`}}
                />
              </div>
              <span className="text-xs font-mono w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryChart;
