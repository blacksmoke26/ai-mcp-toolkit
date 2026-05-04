/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import React from 'react';
import {CopySlash, Edit, Play, Star, Trash2} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Badge} from '@/components/ui/Badge';
import {Checkbox} from '@/components/ui/Checkbox';
import {Button} from '@/components/ui/Button';
import DocTooltip from '@/components/ui/DocTooltip';
import type {PromptTemplate} from '@/lib/api';
import VariablesWidget from './VariablesWidget';

/**
 * Props for the TemplateListItem component.
 */
export interface TemplateListItemProps {
  /** The template data to display. */
  template: PromptTemplate;

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

  /** Whether the template is selected for bulk operations. */
  isSelected: boolean;

  /** Callback to toggle selection. */
  onToggleSelect(): void;
}

/**
 * Template List Item component for List view.
 * Displays a compact row representation of the template with columns for key data.
 */
const TemplateListItem: React.FC<TemplateListItemProps> = (props) => {
  const {template, onEdit, onDelete, onSetDefault, onTest, onClone, isSelected, onToggleSelect} = props;

  return (
    <div
      className={cn('space-y-2 grid grid-cols-12 gap-1 rounded-lg border px-4 py-3 hover:bg-muted/40 transition-colors', isSelected && 'border-primary bg-primary/5')}
    >
      <div className="col-span-1 flex items-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect()}
          className="h-4 w-4"
        />
      </div>
      <div className="col-span-2">
        <div className="font-medium text-sm">{template.displayName}</div>
        <code className="text-xs font-mono text-muted-foreground">{template.name}</code>
      </div>
      <div className="col-span-1">
        <Badge variant="outline" className="text-xs">{template.category}</Badge>
      </div>
      <div className="col-span-3">
        <VariablesWidget variables={template.variables}/>
      </div>
      <div className="col-span-1 gap-1">
        {template.isBuiltIn && <Badge variant="secondary" className="text-xs">Built-in</Badge>}
        {template.isDefault && <Badge variant="default" className="text-xs bg-amber-500">Default</Badge>}
        {!template.isDefault && !template.isDefault && (<Badge variant="outline" className="text-xs">Custom</Badge>)}
      </div>
      <div className="col-span-1 text-right text-sm text-muted-foreground">
        {new Date(template.updatedAt).toLocaleDateString()}
      </div>
      <div className="col-span-3 flex items-start justify-end gap-0">
        <Button variant="ghost" size="icon" onClick={onClone}>
          <CopySlash className={cn('h-4 w-4')}/>
        </Button>
        <Button variant="ghost" size="icon" onClick={onSetDefault}>
          <Star className={cn('h-4 w-4', template.isDefault && 'fill-amber-400 text-amber-500')}/>
        </Button>
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Edit className="h-4 w-4"/>
        </Button>
        <Button variant="ghost" size="icon" onClick={onTest}>
          <Play className="h-4 w-4 text-emerald-500"/>
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-500 hover:text-red-700">
          <Trash2 className="h-4 w-4"/>
        </Button>
      </div>
    </div>
  );
};

export default TemplateListItem;
