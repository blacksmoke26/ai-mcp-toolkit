/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import React from 'react';
import {ChevronDown, ChevronUp, Clock, CopySlash, Edit, Hash, Play, Star, Trash2} from 'lucide-react';

import {cn} from '@/lib/utils';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Checkbox} from '@/components/ui/Checkbox';
import Separator from '@/components/ui/Separator';
import JsonViewer from '@/components/ui/JsonViewer';
import DocTooltip from '@/components/ui/DocTooltip';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/Tooltip';
import VariablesWidget from './VariablesWidget';

import type {PromptTemplate} from '@/lib/api';

/**
 * Props for the TemplateCard component.
 */
export interface TemplateCardProps {
  /** The template data to display. */
  template: PromptTemplate;
  /** Whether the variable details section is expanded. */
  variablesExpanded: boolean;
  /** Whether the template is selected for bulk operations. */
  isSelected: boolean;

  /** Callback to edit the template. */
  onEdit(): void;

  /** Callback to delete the template. */
  onDelete(): void;

  /** Callback to set the template as default. */
  onSetDefault(): void;

  /** Callback to open the test/render dialog. */
  onTest(): void;

  /** Callback to clone the template. */
  onClone(): void;

  /** Callback to toggle the expansion of variable details. */
  onToggleVariables(): void;

  /** Callback to toggle selection. */
  onToggleSelect(): void;
}

/**
 * Template Card component for Grid view.
 * Displays a summary of the template including name, badges, and actions.
 * Supports expanding to show variable details.
 */
const TemplateCard: React.FC<TemplateCardProps> = (props) => {
  const {
    template,
    onEdit,
    onDelete,
    onSetDefault,
    onTest,
    onClone,
    variablesExpanded,
    onToggleVariables,
    isSelected,
    onToggleSelect,
  } = props;

  return (
    <Card
      className={cn('transition-all hover:shadow-md hover:border-primary/40 group cursor-pointer',
        isSelected && 'border-primary bg-primary/5 ring-1 ring-primary')}>
      <CardHeader className="pb-1">
        <div className="flex items-start justify-between gap-2 w-full relative">
          <div className="flex gap-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect()}
              className="h-4 w-4 shrink-0 relative top-1"
            />
            <div className="">
              <div className="flex items-center gap-2 w-full">
                <CardTitle className="text-base">{template.displayName}</CardTitle>
                {template.isBuiltIn && (
                  <Badge variant="secondary" className="text-xs">Built-in</Badge>
                )}
                {template.isDefault && (
                  <Badge variant="default" className="text-xs bg-amber-500 hover:bg-amber-600">
                    Default
                  </Badge>
                )}
              </div>
              <code className="text-xs font-mono text-muted-foreground relative top-[-5px]">{template.name}2</code>
            </div>
          </div>
          <div
            className="flex absolute right-[-18px] top-[-18px] items-center bg-muted/90 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={(e) => {
                    e.stopPropagation();
                    onClone();
                  }}>
                    <CopySlash className={cn('h-4 w-4', template.isDefault && 'fill-amber-400 text-amber-500')}/>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clone "{template.displayName}" to create a new custom template.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={(e) => {
                    e.stopPropagation();
                    onSetDefault();
                  }}>
                    <Star className={cn('h-4 w-4', template.isDefault && 'fill-amber-400 text-amber-500')}/>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{template.isDefault ? 'Remove default' : 'Set as default'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}>
                    <Edit className="h-4 w-4"/>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit template</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={(e) => {
                    e.stopPropagation();
                    onTest();
                  }}>
                    <Play className="h-4 w-4 text-emerald-500"/>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Test &amp; render</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }} className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-4 w-4"/>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete template</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{template.category}</Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
           <Clock className="h-3 w-3"/> {new Date(template.updatedAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-start justify-between">
          <VariablesWidget variables={template.variables}/>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVariables}
            className="text-xs h-7 relative top-[-4px]"
          >
            {variablesExpanded ? (
              <ChevronUp className="h-3 w-3 mr-1"/>
            ) : (
              <ChevronDown className="h-3 w-3 mr-1"/>
            )}
            Details
          </Button>
        </div>
        {variablesExpanded && (
          <div className="rounded-lg border bg-muted/50 p-3 text-xs space-y-1">
            {template.variables.map((v) => (
              <div key={v.name} className="flex items-start gap-2">
                <Hash className="h-3 w-3 mt-0.5 shrink-0"/>
                <div>
                  <span className="font-mono font-medium">{v.name}</span>
                  <span className="text-muted-foreground ml-2">{v.description}</span>
                  {v.required && (
                    <Badge variant="outline" className="ml-1 text-[9px] border-orange-300 text-orange-600">
                      required
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {template.settings && Object.keys(template.settings).length > 0 && (
              <>
                <Separator className="my-2"/>
                <div className="font-medium mb-1">Settings</div>
                <JsonViewer value={template.settings} collapsed={true}/>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TemplateCard;
