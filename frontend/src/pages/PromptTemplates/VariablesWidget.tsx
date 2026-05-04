/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import React from 'react';
import {Hash} from 'lucide-react';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/Tooltip';
import {Badge} from '@/components/ui/Badge';
import {cn} from '@/lib/utils';
import type {PromptTemplate} from '@/lib/api';

/**
 * Props for the VariablesWidget component.
 */
export interface VariablesWidgetProps {
  /** Array of variable definitions to display. */
  variables: PromptTemplate['variables'];
}

/**
 * Variable list widget.
 * Displays a list of variables as badges. Required variables are highlighted
 * with specific styling. Hovering over a badge reveals its description via a tooltip.
 */
const VariablesWidget: React.FC<VariablesWidgetProps> = ({variables}) => {
  if (!variables || variables.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Hash className="h-4 w-4"/>
        <span>No variables</span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {variables.map((v) => (
        <TooltipProvider key={v.name}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  'gap-1 cursor-default',
                  v.required && 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
                )}
              >
                <Hash className="h-3 w-3"/>
                <span className="text-[9px]">{v.name}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{v.description} {v.required &&
                <span className="text-[11px]">(required)</span>}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
};

export default VariablesWidget;
