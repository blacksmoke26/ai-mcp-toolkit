/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import React, {useEffect, useMemo, useState} from 'react';
import {getMCPServerTemplates} from '@/lib/api';
import type {MCPServerTemplate} from '@/types/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {
  ExternalLink,
  FileText,
  Globe,
  Key,
  Loader2,
  Search,
  Tag,
} from 'lucide-react';
import {Input} from '@/components/ui/Input';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Badge} from '@/components/ui/Badge';
import {Select, SelectContent, SelectItem, SelectTrigger} from '@/components/ui/Select';
import {Button} from '@/components/ui/Button';

const CATEGORY_COLORS: Record<string, { bg: string; fg: string; border: string; iconBg: string }> = {
  Database: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    fg: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    iconBg: 'bg-blue-100 dark:bg-blue-900',
  },
  Cloud: {
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    fg: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800',
    iconBg: 'bg-violet-100 dark:bg-violet-900',
  },
  Development: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    fg: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900',
  },
  'AI': {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    fg: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    iconBg: 'bg-orange-100 dark:bg-orange-900',
  },
  Social: {
    bg: 'bg-pink-50 dark:bg-pink-950/30',
    fg: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-800',
    iconBg: 'bg-pink-100 dark:bg-pink-900',
  },
  Storage: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    fg: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    iconBg: 'bg-amber-100 dark:bg-amber-900',
  },
  Monitoring: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    fg: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    iconBg: 'bg-red-100 dark:bg-red-900',
  },
  Networking: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/30',
    fg: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900',
  },
  DevOps: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    fg: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900',
  },
  Utility: {
    bg: 'bg-gray-50 dark:bg-gray-950/30',
    fg: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
    iconBg: 'bg-gray-100 dark:bg-gray-900',
  },
  Communication: {
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    fg: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
    iconBg: 'bg-sky-100 dark:bg-sky-900',
  },
  Productivity: {
    bg: 'bg-lime-50 dark:bg-lime-950/30',
    fg: 'text-lime-700 dark:text-lime-300',
    border: 'border-lime-200 dark:border-lime-800',
    iconBg: 'bg-lime-100 dark:bg-lime-900',
  },
  Search: {
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    fg: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
    iconBg: 'bg-teal-100 dark:bg-teal-900',
  },
  System: {
    bg: 'bg-zinc-50 dark:bg-zinc-950/30',
    fg: 'text-zinc-700 dark:text-zinc-300',
    border: 'border-zinc-200 dark:border-zinc-800',
    iconBg: 'bg-zinc-100 dark:bg-zinc-900',
  },
  Maps: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    fg: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    iconBg: 'bg-rose-100 dark:bg-rose-900',
  },
  Design: {
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/30',
    fg: 'text-fuchsia-700 dark:text-fuchsia-300',
    border: 'border-fuchsia-200 dark:border-fuchsia-800',
    iconBg: 'bg-fuchsia-100 dark:bg-fuchsia-900',
  },
  Automation: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    fg: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900',
  },
};

/**
 * Retrieves the color metadata for a given category.
 * @param category - The category name to look up.
 * @returns The color configuration object if found, otherwise null.
 */
const getCategoryMeta = (category?: string) => category ? (CATEGORY_COLORS[category] ?? null) : null;

/**
 * Determines the visual variant for a type badge based on the server type.
 * @param type - The server type (e.g., 'stdio', 'sse').
 * @returns The corresponding badge variant style.
 */
const typeBadgeVariant = (type: string): 'default' | 'secondary' | 'outline' => {
  switch (type) {
    case 'stdio':
      return 'default';
    case 'sse':
      return 'secondary';
    default:
      return 'outline';
  }
};

interface VariableRowProps {
  /** The variable object containing configuration details for a template variable */
  variable: MCPServerTemplate['variables'][number];
}

/**
 * Displays a single row representing a configuration variable.
 * Shows the variable key, required status, description, and default value.
 */
const VariableRow: React.FC<VariableRowProps> = ({variable}) => (
  <div
    className="group flex flex-col gap-1 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/60">
    <div className="flex items-center gap-2">
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground/70">
        V
      </span>
      <code className="text-sm font-semibold text-foreground">{variable.key}</code>
      {variable.required && (
        <Badge variant="destructive" className="text-[10px]">Required</Badge>
      )}
      {!variable.required && variable.default !== undefined && (
        <Badge variant="outline" className="text-[10px] opacity-60">Default</Badge>
      )}
    </div>
    {variable.description && (
      <p className="ml-7 text-xs text-muted-foreground">{variable.description}</p>
    )}
    {/*{variable.example && (
      <div className="ml-7">
        <span className="text-[10px] text-muted-foreground/50">Example:</span>
        <code
          className="ml-1.5 rounded bg-background/80 px-1.5 py-0.5 text-[11px] font-medium text-foreground shadow-sm">
          {variable.example}
        </code>
      </div>
    )}
    {variable.default !== undefined && (
      <div className="ml-7">
        <span className="text-[10px] text-muted-foreground/50">Default:</span>
        <code
          className="ml-1.5 rounded bg-background/80 px-1.5 py-0.5 text-[11px] font-medium text-emerald-600 shadow-sm">
          {variable.default}
        </code>
      </div>
    )}*/}
  </div>
);

/** Properties for the TagPill component. */
interface TagPillProps {
  /** The tag text to display. */
  tag: string;
}

/**
 * Displays a small, styled pill representing a tag.
 * Includes an icon and the tag text with hover effects.
 */
const TagPill: React.FC<TagPillProps> = ({ tag }) => (
  <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground/80 transition-all hover:border-border hover:bg-muted/70">
    <Tag className="h-3 w-3 opacity-40" />
    {tag}
  </span>
);

export interface TemplateDialogProps {
  /**
   * Controls whether the dialog is currently open.
   */
  open: boolean;

  /**
   * Callback function invoked when the dialog's open state changes.
   * @param open - The new open state of the dialog.
   */
  onOpenChange(open: boolean): void;

  /**
   * Callback function invoked when a template is selected.
   * @param template - The selected MCP server template data.
   */
  onSelectTemplate(template: MCPServerTemplate): void;
}

const TemplateDialog: React.FC<TemplateDialogProps> = (props) => {
  const {open, onOpenChange, onSelectTemplate} = props;

  const [templates, setTemplates] = useState<MCPServerTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');

  useEffect(() => {
    if (open) {
      fetchTemplates();
      setSearchQuery('');
      setCategoryFilter('all');
      setTagFilter('all');
    }
  }, [open]);

  /** Fetches the list of templates from the API. */
  const fetchTemplates = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await getMCPServerTemplates();
      setTemplates(response.templates || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category).filter(Boolean));
    return ['all', ...Array.from(cats).sort()];
  }, [templates]);

  const tags = useMemo(() => {
    const tagSet = new Set<string>();
    templates.forEach(t => t.tags?.forEach(tag => tagSet.add(tag)));
    return ['all', ...Array.from(tagSet).sort()];
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return templates.filter(t => {
      if (q) {
        const searchable = [
          t.displayName, t.description, t.notes, t.category, t.type,
          ...(t.tags ?? []),
        ].join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (tagFilter !== 'all' && !(t.tags ?? []).includes(tagFilter)) return false;
      return true;
    });
  }, [templates, searchQuery, categoryFilter, tagFilter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent scrollBehavior="outside" className="max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* ── Header ─────────────────────────────────────────────── */}
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 shadow-sm">
              <Globe className="h-5 w-5 text-white"/>
            </div>
            <span>MCP Server Templates</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {templates.length} available
            </Badge>
          </DialogTitle>
          <DialogDescription className="pt-1">
            Browse, search, and filter from our curated collection of ready-to-use MCP server templates.
          </DialogDescription>
        </DialogHeader>

        {/* ── Body (scrollable) ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto space-y-5 py-4 -mx-6 px-6">
          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50"/>
              <Input
                placeholder="Search by name, description, tags, or category…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger
                className="w-[160px] h-10 flex items-center justify-between rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <span className="truncate">{categoryFilter === 'all' ? 'All Categories' : categoryFilter}</span>
              </SelectTrigger>
                <SelectContent
                  className="z-50 min-w-[160px] overflow-hidden rounded-md border bg-popover p-1 shadow-md"
                  sideOffset={5}>
                  {categories.map(cat => (
                    <SelectItem
                      key={cat}
                      value={cat}
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
                    >
                      {cat === 'all' ? 'All Categories' : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
            </Select>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger
                className="w-[160px] h-10 flex items-center justify-between rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <span className="truncate">{tagFilter === 'all' ? 'All Tags' : tagFilter}</span>
              </SelectTrigger>
                <SelectContent
                  className="z-50 min-w-[160px] overflow-hidden rounded-md border bg-popover p-1 shadow-md"
                  sideOffset={5}>
                  {tags.map(tag => (
                    <SelectItem
                      key={tag}
                      value={tag}
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
                    >
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
            </Select>
          </div>

          {/* Results info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}</span>
            {(categoryFilter !== 'all' || tagFilter !== 'all' || searchQuery) && (
              <Button
                variant="ghost"
                size="xs"
                className="h-5 px-1.5 text-[11px] text-muted-foreground"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setTagFilter('all');
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 rounded-full bg-muted/50 p-4">
                <Search className="h-7 w-7 text-muted-foreground/40"/>
              </div>
              <p className="text-sm font-medium text-foreground">No templates found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map(template => {
                const catMeta = getCategoryMeta(template.category);
                const hasVariables = (template.variables?.length ?? 0) > 0;
                return (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    hasVariables={hasVariables}
                    onSelect={() => {
                      onSelectTemplate(template);
                      onOpenChange(false);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <DialogFooter className="pt-2 flex justify-between">
          <p>
            <a
              href="https://registry.modelcontextprotocol.io/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[13px] mt-2 mr-4 font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Browse more servers
            </a>
          </p>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface TemplateCardProps {
  template: MCPServerTemplate;
  hasVariables: boolean;

  onSelect(): void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({template, hasVariables, onSelect}) => {
  const active = getCategoryMeta(template.category);
  const colorClasses = active
    ? `border-l-4 ${active.border}`
    : 'border-l-4 border-border/30';

  return (
    <Card
      className={`group relative overflow-hidden border-l-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${colorClasses}`}
    >
      {/* Category accent bar */}
      {active && (
        <div className={`absolute top-0 right-0 h-full w-1 ${active.iconBg.replace('bg-', 'bg-opacity-30 bg-')}`}/>
      )}

      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`shrink-0 flex h-11 w-11 items-center justify-center rounded-xl text-xl shadow-sm ${active?.iconBg ?? 'bg-muted'}`}
          >
            {template.icon}
          </div>

          <div className="flex-1 min-w-0">
            <CardTitle className="text-base leading-tight truncate">{template.displayName}</CardTitle>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant={typeBadgeVariant(template.type)} className="text-[10px]">
                {template.type}
              </Badge>
              {template.category && (
                <span className={`text-[10px] font-medium ${active?.fg ?? 'text-muted-foreground'}`}>
                  {template.category}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-2">
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
          {template.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags?.map(tag => <TagPill key={tag} tag={tag}/>)}
        </div>

        {/* Variables panel */}
        {/*{hasVariables && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Key className="h-3.5 w-3.5 text-muted-foreground/50"/>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Variables
              </span>
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {template.variables?.length}
              </Badge>
            </div>
            <div className="space-y-1.5">
              {template.variables?.map((variable, idx) => (
                <VariableRow key={idx} variable={variable}/>
              ))}
            </div>
          </div>
        )}*/}

        {/* Notes */}
        {template.notes && (
          <div className="mb-3">
            <span
              className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-1">
              <FileText className="h-3.5 w-3.5"/>
              Notes
            </span>
            <p className="text-xs text-muted-foreground/80 leading-relaxed">{template.notes}</p>
          </div>
        )}

        {/* Links */}
        <div className="flex items-center gap-2 mt-2">
          {template.documentationUrl && (
            <a
              href={template.documentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-500 hover:text-blue-600 transition-colors"
            >
              <ExternalLink className="h-3 w-3"/>
              Documentation
            </a>
          )}
          {template.homepage && (
            <a
              href={template.homepage}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Homepage
            </a>
          )}
          <div className="flex-1"/>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={onSelect}
          >
            Use Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TemplateDialog;
