/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import type {MCPServerTemplate} from '@/types/api.ts';
import React, {useEffect, useState} from 'react';
import {getMCPServerTemplates} from '@/lib/api.ts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {ExternalLink, Globe, Loader2, Plus, Search} from 'lucide-react';
import {Input} from '@/components/ui/Input';
import * as Select from '@radix-ui/react-select';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import Popover from '@/components/ui/Popover';

/**
 * Properties for the TemplateDialog component.
 */
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

  /** State to store the list of fetched MCP server templates. */
  const [templates, setTemplates] = useState<MCPServerTemplate[]>([]);

  /** State to track the loading status during template fetching. */
  const [loading, setLoading] = useState<boolean>(false);

  /** State for the current search query string. */
  const [searchQuery, setSearchQuery] = useState<string>('');

  /** State for the selected category filter. Defaults to 'all'. */
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  /** State for the selected tag filter. Defaults to 'all'. */
  const [tagFilter, setTagFilter] = useState<string>('all');

  /** State for the currently selected template (for detailed view). */
  const [selectedTemplate, setSelectedTemplate] = useState<MCPServerTemplate | null>(null);

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

  /** Memoized list of unique categories derived from templates. */
  const categories: string[] = React.useMemo(() => {
    const cats = new Set(templates.map(t => t.category).filter(Boolean));
    return ['all', ...Array.from(cats).sort()];
  }, [templates]);

  /** Memoized list of unique tags derived from templates. */
  const tags: string[] = React.useMemo(() => {
    const tagSet = new Set<string>();
    templates.forEach(t => t.tags?.forEach(tag => tagSet.add(tag)));
    return ['all', ...Array.from(tagSet).sort()];
  }, [templates]);

  /**
   * Returns the border color class for a given category.
   * @param category - The category name.
   * @returns The corresponding Tailwind border class or undefined.
   */
  const getCategoryColor = (category?: string): string | undefined => {
    if (!category) return undefined;
    const colors: Record<string, string> = {
      'Database': 'border-blue-500',
      'Cloud': 'border-purple-500',
      'Development': 'border-green-500',
      'Utility': 'border-gray-500',
      'AI': 'border-orange-500',
      'Social': 'border-pink-500',
      'Storage': 'border-yellow-500',
      'Monitoring': 'border-red-500',
      'Networking': 'border-cyan-500',
      'DevOps': 'border-indigo-500',
    };
    return colors[category] || 'border-muted';
  };

  /** Memoized list of templates filtered by search query, category, and tag. */
  const filteredTemplates: MCPServerTemplate[] = React.useMemo(() => {
    return templates.filter(template => {
      // Search filter - includes tags
      const searchLower: string = searchQuery.toLowerCase();
      const matchesSearch: boolean = !searchQuery ||
        template.displayName.toLowerCase().includes(searchLower) ||
        template.description.toLowerCase().includes(searchLower) ||
        template.notes?.toLowerCase().includes(searchLower) ||
        template.category?.toLowerCase().includes(searchLower) ||
        template.tags?.some(tag => tag.toLowerCase().includes(searchLower));

      // Category filter
      const matchesCategory: boolean = categoryFilter === 'all' || template.category === categoryFilter;

      // Tag filter
      const matchesTag: boolean = tagFilter === 'all' || template.tags?.includes(tagFilter);

      return matchesSearch && matchesCategory && matchesTag;
    });
  }, [templates, searchQuery, categoryFilter, tagFilter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5"/>
            MCP Server Templates
          </DialogTitle>
          <DialogDescription>
            Choose a pre-configured template to quickly set up a common MCP server
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Search and Filter Bar */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
              <Input
                placeholder="Search templates (name, description, category, tags, notes)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select.Root value={categoryFilter} onValueChange={setCategoryFilter}>
                <Select.Trigger className="w-[150px]">
                  <Select.Value placeholder="Category"/>
                </Select.Trigger>
                <Select.Content>
                  {categories.map(cat => (
                    <Select.Item key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>

              <Select.Root value={tagFilter} onValueChange={setTagFilter}>
                <Select.Trigger className="w-[150px]">
                  <Select.Value placeholder="Tag"/>
                </Select.Trigger>
                <Select.Content>
                  {tags.map(tag => (
                    <Select.Item key={tag} value={tag}>
                      {tag === 'all' ? 'All Tags' : tag}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            {filteredTemplates.length} of {templates.length} templates
          </div>

          {/* Templates Grid */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin"/>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30"/>
              <p>No templates found matching your filters</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredTemplates.map((template) => (
                <Popover
                  trigger={() => (
                    <Card
                      className={`cursor-pointer hover:bg-accent/50 transition-colors border-l-4 ${getCategoryColor(template.category)}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              {template.icon && <span className="text-2xl">{template.icon}</span>}
                              <CardTitle className="text-lg">{template.displayName}</CardTitle>
                            </div>
                            <CardDescription className="line-clamp-2">
                              {template.description}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Badge variant="secondary">{template.type}</Badge>
                            {template.category && (
                              <Badge variant="outline">{template.category}</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1.5">
                          {template.tags?.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  key={template.id}
                  open={selectedTemplate?.id === template.id}
                  onOpenChange={(open) => {
                    if (open) {
                      setSelectedTemplate(template);
                    } else {
                      setSelectedTemplate(null);
                    }
                  }}
                >
                  <div className="space-y-3">
                    {template.icon && (
                      <div className="text-4xl text-center">{template.icon}</div>
                    )}
                    <div>
                      <h4 className="font-semibold text-base">{template.displayName}</h4>
                      {template.category && (
                        <Badge variant="outline" className="mt-1">{template.category}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                    {template.notes && (
                      <div>
                        <h5 className="font-medium text-sm mb-1">Notes</h5>
                        <p className="text-xs text-muted-foreground">{template.notes}</p>
                      </div>
                    )}
                    {template.tags && template.tags.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-1">Tags</h5>
                        <div className="flex flex-wrap gap-1">
                          {template.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {template.variables && template.variables.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-1">Variables</h5>
                        <div className="space-y-1">
                          {template.variables.map((variable, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-mono font-semibold">{variable.key}</span>
                              {variable.required && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                              {variable.description && (
                                <p className="text-muted-foreground">{variable.description}</p>
                              )}
                              {variable.example && (
                                <code className="bg-muted px-1 rounded text-[10px]">{variable.example}</code>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      {template.documentationUrl && (
                        <a
                          href={template.documentationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 text-center text-xs text-blue-500 hover:underline flex items-center justify-center gap-1"
                        >
                          Docs <ExternalLink className="w-3 h-3"/>
                        </a>
                      )}
                      {template.homepage && (
                        <a
                          href={template.homepage}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 text-center text-xs text-blue-500 hover:underline flex items-center justify-center gap-1"
                        >
                          Homepage <ExternalLink className="w-3 h-3"/>
                        </a>
                      )}
                    </div>
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTemplate(template);
                        onOpenChange(false);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2"/>
                      Use Template
                    </Button>
                  </div>
                </Popover>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateDialog;
