/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';

/**
 * StatCard displays a single metric with icon, label, value and optional secondary info.
 */
export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | React.ReactNode;
  secondary?: string;
  accentColor?: string;
  bgAccent?: string;
}

const StatCard: React.FC<StatCardProps> = (props) => {
  const {
    icon,
    label,
    value,
    secondary,
    accentColor = 'text-primary',
    bgAccent = 'bg-muted/50',
  } = props;

  return (
    <Card
      className="hover:border-l-primary/50 hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3 pt-4 px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/80">
            {label}
          </CardTitle>
          <div className={`p-2 rounded-xl ${bgAccent} ${accentColor}`}>
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4 pt-0 px-6">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {secondary && (
          <p className="text-xs text-muted-foreground/70 mt-1.5 flex items-center gap-1">
            {secondary}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
