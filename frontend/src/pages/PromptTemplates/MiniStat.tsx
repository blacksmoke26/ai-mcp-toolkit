/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import React from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {cn} from '@/lib/utils';

/**
 * Props for the MiniStat component.
 */
export interface MiniStatProps {
  /** The title label for the statistic. */
  title: string;
  /** The numerical or string value to display. */
  value: string | number;
  /** The Lucide React icon component to render. */
  icon: React.ElementType;
  /** Optional Tailwind CSS color class for the icon. Defaults to 'text-primary'. */
  color?: string;
}

/**
 * Mini stat card.
 * Displays a single statistic with a title, value, and an associated icon.
 * Used in the dashboard summary grid.
 */
const MiniStat: React.FC<MiniStatProps> = ({title, value, icon: Icon, color = 'text-primary'}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={cn('h-5 w-5 opacity-60', color)}/>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

export default MiniStat;
