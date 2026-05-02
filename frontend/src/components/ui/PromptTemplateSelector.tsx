/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * PromptTemplateSelector - A component for selecting and managing prompt templates.
 *
 * Provides a dropdown selector for built-in templates and a modal interface for
 * creating/editing custom templates with variable substitution preview.
 */

import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Edit3,
  Eye,
  Hash,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import {
  createPromptTemplate,
  deletePromptTemplate,
  getPromptTemplateCategories,
  listPromptTemplates,
  type PromptTemplate,
  type PromptTemplateCreateInput,
  type PromptTemplateUpdateInput,
  type PromptTemplateVariable,
  updatePromptTemplate,
} from '@/lib/api';
import {Button} from './Button';
import {Badge} from './Badge';
import {Input} from './Input';
import {Textarea} from './Textarea';
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from './Dialog';
import {Tabs, TabsContent, TabsList, TabsTrigger} from './Tabs';
import {ScrollArea} from './ScrollArea';
import {Alert, AlertDescription} from './Alert';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from './Select';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from './Tooltip';

// ─── Types ──────────────────────────────────────────────────────────────────────────────────────

interface PromptTemplateSelectorProps {
  /** Currently selected template (optional) */
  selectedTemplate?: PromptTemplate | null;
  /** Placeholder text for the prompt input */
  inputPlaceholder?: string;
  /** Disable the selector */
  disabled?: boolean;
  /** Show the template preview panel */
  showPreview?: boolean;
  /** Callback when selection changes */
  onTemplateSelect(template: PromptTemplate | null): void;
  /** Callback to get the filled template content for the message */
  onApply(): void;
}
/**
 * Form data structure for creating or editing a prompt template.
 */
interface TemplateFormData {
  /** Unique identifier for the template (auto-formatted to lowercase snake_case) */
  name: string;
  /** Human-readable name displayed in the UI */
  displayName: string;
  /** Detailed explanation of the template's purpose */
  description: string;
  /** The prompt text content, potentially containing variable placeholders */
  content: string;
  /** The category key (e.g., 'general', 'code') used for grouping and styling */
  category: string;
  /** Array of variable definitions for dynamic content substitution */
  variables: PromptTemplateVariable[];
}

/**
 * Props for the VariableEditModal component.
 */
interface VariableEditModalProps {
  /** Controls whether the modal is currently visible */
  isOpen: boolean;
  /** Initial form data to populate the modal. If null, the modal is in "create" mode. */
  initialData?: TemplateFormData | null;
  /** Callback function triggered when the modal is closed without saving */
  onClose(): void;
  /** Callback function triggered when the user saves the form data */
  onSave(data: TemplateFormData): void;
}

// ─── Constants ──────────────────────────────────────────────────────────────────────────────────

/**
 * List of available template categories with their display labels and icons.
 * Used for categorization and UI rendering.
 */
const CATEGORIES = [
  {value: 'general', label: 'General', icon: '✨'},
  {value: 'code', label: 'Code', icon: '💻'},
  {value: 'writing', label: 'Writing', icon: '📝'},
  {value: 'analysis', label: 'Analysis', icon: '🔍'},
  {value: 'creative', label: 'Creative', icon: '🎨'},
  {value: 'business', label: 'Business', icon: '💼'},
] as const;

/**
 * Built-in prompt templates available by default.
 * These are hardcoded and cannot be deleted by the user.
 */
const BUILTIN_TEMPLATES: PromptTemplate[] = [
  {
    id: 0,
    name: 'general',
    displayName: 'General Assistant',
    description: 'A general-purpose assistant for any task',
    content: '{{message}}',
    category: 'general',
    isBuiltIn: true,
    isDefault: true,
    variables: [],
    settings: null,
    createdAt: '',
    updatedAt: '',
  },
];

// ─── Helper Functions ───────────────────────────────────────────────────────────────────────────

/**
 * Retrieves the icon emoji associated with a specific template category.
 *
 * @param category - The category key (e.g., 'code').
 * @returns The icon emoji string, or a default document icon if not found.
 */
const getTemplateIcon = (category: string): string => {
  const found = CATEGORIES.find((c) => c.value === category);
  return found?.icon ?? '📄';
};

/**
 * Retrieves the Tailwind CSS class string for styling badges based on the category.
 *
 * @param category - The category key (e.g., 'code').
 * @returns A string of CSS classes for background and text colors.
 */
const getTemplateColor = (category: string): string => {
  const colors: Record<string, string> = {
    general: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    code: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    writing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    analysis: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    creative: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    business: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  };
  return colors[category] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
};

// ─── Component: VariableEditModal ───────────────────────────────────────────────────────────────

/**
 * VariableEditModal - A modal component for creating or editing prompt templates.
 *
 * Manages the form state for template details, content, and variable definitions.
 * Includes logic for previewing variable substitution within the template content.
 */
const VariableEditModal: React.FC<VariableEditModalProps> = ({
  /** Controls whether the modal is currently visible */
  isOpen,
  /** Callback function triggered when the modal is closed without saving */
  onClose,
  /** Callback function triggered when the user saves the form data */
  onSave,
  /** Initial form data to populate the modal. If null, the modal is in "create" mode */
  initialData,
}) => {
  /** State object holding the current form data for the template */
  const [formData, setFormData] = useState<TemplateFormData>({
    /** Unique identifier for the template (auto-formatted to lowercase snake_case) */
    name: '',
    /** Human-readable name displayed in the UI */
    displayName: '',
    /** Detailed explanation of the template's purpose */
    description: '',
    /** The prompt text content, potentially containing variable placeholders */
    content: '',
    /** The category key (e.g., 'general', 'code') used for grouping and styling */
    category: 'general',
    /** Array of variable definitions for dynamic content substitution */
    variables: [],
  });

  /** Resets form data when the modal opens or initialData changes */
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        displayName: '',
        description: '',
        content: '',
        category: 'general',
        variables: [],
      });
    }
  }, [initialData, isOpen]);

  /** Adds a new, empty variable definition to the form state */
  const addVariable = () => {
    setFormData((prev) => ({
      ...prev,
      variables: [...prev.variables, {name: '', description: '', required: false}],
    }));
  };

  /**
   * Updates a specific field of a variable definition at the given index.
   *
   * @param index - The index of the variable in the array to update.
   * @param field - The specific field key (e.g., 'name', 'description', 'required') to update.
   * @param value - The new value for the field (string for text, boolean for required).
   */
  const updateVariable = (index: number, field: keyof PromptTemplateVariable, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      variables: prev.variables.map((v, i) => (i === index ? {...v, [field]: value} : v)),
    }));
  };

  /**
   * Removes a variable definition from the form state at the specified index.
   *
   * @param index - The index of the variable to remove.
   */
  const removeVariable = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index),
    }));
  };

  /**
   * Validates the form data and triggers the save callback if valid.
   * Ensures that name, display name, and content are not empty.
   */
  const handleSave = () => {
    if (!formData.name.trim() || !formData.displayName.trim() || !formData.content.trim()) {
      return;
    }
    onSave(formData);
  };

  /**
   * Generates a preview of the template content with variables replaced by placeholder values.
   * Variables are replaced with a string representation like `[variable_name]`.
   *
   * @returns The processed template content string.
   */
  const previewContent = React.useMemo(() => {
    /** Map of variable names to their placeholder strings for the preview */
    const sampleVars: Record<string, string> = {};
    formData.variables.forEach((v) => {
      sampleVars[v.name] = v.name ? `[${v.name}]` : '[variable]';
    });
    /** The content string to be processed */
    let preview = formData.content;
    Object.entries(sampleVars).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return preview;
  }, [formData.content, formData.variables]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-primary"/>
            {initialData ? 'Edit Template' : 'Create New Template'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-4">
              <TabsContent value="details" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Template Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({
                      ...p,
                      name: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                    }))}
                    placeholder="e.g., code_review"
                    className={formData.name ? '' : 'border-red-300'}
                  />
                  <p className="text-xs text-muted-foreground">Unique identifier, auto-formatted to lowercase</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Display Name *</label>
                  <Input
                    value={formData.displayName}
                    onChange={(e) => setFormData((p) => ({...p, displayName: e.target.value}))}
                    placeholder="e.g., Code Review Assistant"
                    className={formData.displayName ? '' : 'border-red-300'}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({...p, description: e.target.value}))}
                    placeholder="Brief description of what this template does"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData((p) => ({...p, category: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category"/>
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Template Content *</label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-muted-foreground cursor-help">
                            Use <code className="bg-muted px-1 rounded">{'{{variable_name}}'}</code> for variables
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Variables will be replaced with user input when the template is
                            applied</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData((p) => ({...p, content: e.target.value}))}
                    placeholder="Enter your prompt template here..."
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Hash className="h-4 w-4"/>
                      Variables ({formData.variables.length})
                    </h4>
                    <Button size="sm" variant="outline" onClick={addVariable} className="h-7">
                      <Plus className="h-3 w-3 mr-1"/>
                      Add
                    </Button>
                  </div>

                  {formData.variables.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground bg-muted/50 rounded-lg">
                      No variables defined. Add variables to create dynamic templates.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.variables.map((variable, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg border">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                value={variable.name}
                                onChange={(e) => updateVariable(index, 'name', e.target.value)}
                                placeholder="variable_name"
                                className="h-8 text-sm"
                              />
                              <span className="text-xs text-muted-foreground">=</span>
                              <Input
                                value={variable.description}
                                onChange={(e) => updateVariable(index, 'description', e.target.value)}
                                placeholder="description"
                                className="h-8 text-sm flex-1"
                              />
                            </div>
                            <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={variable.required}
                                onChange={(e) => updateVariable(index, 'required', e.target.checked)}
                                className="rounded border-gray-300"
                              />
                              <span className="text-muted-foreground">Required</span>
                            </label>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeVariable(index)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3"/>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary"/>
                    Template Preview
                  </h4>
                  <div className="p-4 bg-muted/30 rounded-lg border font-mono text-sm whitespace-pre-wrap">
                    {previewContent || <span className="text-muted-foreground italic">Start typing in the Content tab to see preview...</span>}
                  </div>
                </div>

                {formData.variables.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary"/>
                      Defined Variables
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {formData.variables.map((variable, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className={`px-3 py-1 ${variable.required ? 'border-primary/50 bg-primary/10' : ''}`}
                        >
                          <span className="font-mono text-xs">{'{{' + (variable.name || 'var') + '}}'}</span>
                          {variable.required && <span className="ml-1 text-xs text-destructive">*</span>}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.name.trim() || !formData.displayName.trim() || !formData.content.trim()}
          >
            <Check className="h-4 w-4 mr-2"/>
            {initialData ? 'Update' : 'Create'} Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Component: PromptTemplateSelector ───────────────────────────────────────────────────────────

/**
 * PromptTemplateSelector - A component for selecting and managing prompt templates.
 *
 * Provides a dropdown selector for built-in templates and a modal interface for
 * creating/editing custom templates with variable substitution preview.
 */
export const PromptTemplateSelector: React.FC<PromptTemplateSelectorProps> = (props) => {
  const {
    /** Currently selected template (optional) */
    selectedTemplate,
    /** Callback when selection changes */
    onTemplateSelect,
    /** Callback to get the filled template content for the message */
    onApply,
    /** Placeholder text for the prompt input */
    inputPlaceholder = 'Type your message here...',
    /** Disable the selector */
    disabled = false,
    /** Show the template preview panel */
    showPreview = false,
  } = props;

  /** List of all available templates (built-in + custom) */
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  /** List of available category keys */
  const [categories, setCategories] = useState<string[]>([]);
  /** Currently selected category filter ('all' or specific category key) */
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  /** Loading state for async operations */
  const [isLoading, setIsLoading] = useState<boolean>(false);
  /** Controls the visibility of the edit template modal */
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  /** The template currently being edited, or null if none */
  const [editTemplate, setEditTemplate] = useState<PromptTemplate | null>(null);
  /** Controls the visibility of the create template modal */
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  /** Error message string, or null if no error */
  const [error, setError] = useState<string | null>(null);
  /** Controls the visibility of the template dropdown */
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  /** Ref to the dropdown container for click-outside detection */
  const dropdownRef = useRef<HTMLDivElement>(null);

  /**
   * Fetches the list of prompt templates from the API.
   * Combines built-in templates with user-defined templates.
   * Filters by category if a specific category is selected.
   */
  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listPromptTemplates(selectedCategory === 'all' ? undefined : selectedCategory);
      const allTemplates = [...BUILTIN_TEMPLATES, ...(data.templates || [])];
      setTemplates(allTemplates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  /**
   * Fetches the list of available template categories from the API.
   * Silently ignores errors to prevent UI disruption.
   */
  const fetchCategories = useCallback(async () => {
    try {
      const data = await getPromptTemplateCategories();
      setCategories(data.categories);
    } catch {
      // Ignore errors
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, [fetchTemplates, fetchCategories]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Handles the creation of a new prompt template.
   *
   * Constructs the API input payload from the form data, calls the creation API,
   * updates the local state with the new template, and closes the modal.
   *
   * @param data - The form data containing the template details.
   */
  const handleCreateTemplate = async (data: TemplateFormData): Promise<void> => {
    try {
      /** Input payload for the API creation request */
      const input: PromptTemplateCreateInput = {
        /** Unique identifier for the template */
        name: data.name,
        /** Human-readable name displayed in the UI */
        displayName: data.displayName,
        /** Detailed explanation of the template's purpose */
        description: data.description,
        /** The prompt text content with variable placeholders */
        content: data.content,
        /** The category key (e.g., 'general', 'code') */
        category: data.category,
        /** Array of variable definitions for dynamic content substitution */
        variables: data.variables,
      };
      /** The created template object returned from the API */
      const created: PromptTemplate = await createPromptTemplate(input);
      setTemplates((prev: PromptTemplate[]) => [...prev, created]);
      setIsCreateModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    }
  };

  /**
   * Handles the update of an existing prompt template.
   *
   * Constructs the API input payload from the form data, calls the update API,
   * updates the local state by replacing the old template, and closes the modal.
   *
   * @param data - The form data containing the updated template details.
   */
  const handleUpdateTemplate = async (data: TemplateFormData): Promise<void> => {
    if (!editTemplate) return;
    try {
      /** Input payload for the API update request */
      const input: PromptTemplateUpdateInput = {
        /** Human-readable name displayed in the UI */
        displayName: data.displayName,
        /** Detailed explanation of the template's purpose */
        description: data.description,
        /** The prompt text content with variable placeholders */
        content: data.content,
        /** The category key (e.g., 'general', 'code') */
        category: data.category,
        /** Array of variable definitions for dynamic content substitution */
        variables: data.variables,
      };
      /** The updated template object returned from the API */
      const updated: PromptTemplate = await updatePromptTemplate(editTemplate.id, input);
      setTemplates((prev: PromptTemplate[]) => prev.map((t: PromptTemplate) => (t.id === updated.id ? updated : t)));
      setIsEditModalOpen(false);
      setEditTemplate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
    }
  };

  /**
   * Handles the deletion of a prompt template.
   *
   * Prompts the user for confirmation, calls the delete API, updates the local
   * state by removing the template, and clears the selection if the deleted
   * template was currently selected.
   *
   * @param id - The unique identifier of the template to delete.
   */
  const handleDeleteTemplate = async (id: number): Promise<void> => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await deletePromptTemplate(id);
      setTemplates((prev: PromptTemplate[]) => prev.filter((t: PromptTemplate) => t.id !== id));
      if (selectedTemplate?.id === id) {
        onTemplateSelect(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  /**
   * Handles the selection of a template from the dropdown.
   *
   * Updates the parent component with the selected template and closes the dropdown.
   *
   * @param template - The template object that was selected.
   */
  const handleSelect = (template: PromptTemplate): void => {
    onTemplateSelect(template);
    setShowDropdown(false);
  };

  /**
   * Determines the currently active template for display purposes.
   *
   * Prioritizes the explicitly selected template, falling back to the default
   * built-in template, and finally to the first built-in template if no default is found.
   */
  const currentTemplate: PromptTemplate = selectedTemplate || BUILTIN_TEMPLATES.find((t: PromptTemplate) => t.isDefault) || BUILTIN_TEMPLATES[0];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Template Selector Button */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 text-sm"
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={disabled}
          >
            <Wand2 className="h-4 w-4"/>
            <span className="hidden sm:inline truncate max-w-[150px]">
              {currentTemplate.displayName}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}/>
          </Button>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-popover border rounded-lg shadow-lg z-50">
              <div className="p-3 border-b">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary"/>
                    Prompt Templates
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="h-7 px-2"
                  >
                    <Plus className="h-3 w-3 mr-1"/>
                    New
                  </Button>
                </div>

                {/* Category Filter */}
                {categories.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <Badge
                      variant={selectedCategory === 'all' ? 'default' : 'outline'}
                      className="cursor-pointer h-6"
                      onClick={() => setSelectedCategory('all')}
                    >
                      All
                    </Badge>
                    {categories.map((cat) => (
                      <Badge
                        key={cat}
                        variant={selectedCategory === cat ? 'default' : 'outline'}
                        className="cursor-pointer h-6"
                        onClick={() => setSelectedCategory(cat)}
                      >
                        {getTemplateIcon(cat)} {cat}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <ScrollArea className="max-h-64">
                <div className="p-2 space-y-1">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No templates found
                    </div>
                  ) : (
                    templates.map((template) => (
                      <div
                        key={template.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => handleSelect(template)}
                      >
                        <div className={`p-2 rounded-lg ${getTemplateColor(template.category)}`}>
                          <span className="text-lg">{getTemplateIcon(template.category)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {template.displayName || template.name}
                            </span>
                            {template.isBuiltIn && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                Built-in
                              </Badge>
                            )}
                            {template.isDefault && !template.isBuiltIn && (
                              <Badge variant="outline"
                                     className="text-[10px] h-4 px-1.5 border-primary/30 text-primary">
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {template.description || template.content.substring(0, 50)}
                          </p>
                        </div>
                        {!template.isBuiltIn && (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditTemplate(template);
                                      setIsEditModalOpen(true);
                                    }}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Edit3 className="h-3 w-3"/>
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
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteTemplate(template.id)}
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3"/>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delete template</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Apply Button */}
        {selectedTemplate && (
          <Button size="sm" onClick={onApply} className="h-9 gap-2">
            <Sparkles className="h-4 w-4"/>
            <span className="hidden sm:inline">Apply</span>
          </Button>
        )}
      </div>

      {/* Preview Panel */}
      {showPreview && selectedTemplate && (
        <div className="mt-2 p-3 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-primary"/>
            <span className="text-sm font-medium">Template Preview</span>
          </div>
          <div className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
            {selectedTemplate.content}
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mt-2 text-sm">
          <AlertCircle className="h-4 w-4"/>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Edit Modal */}
      {editTemplate && (
        <VariableEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditTemplate(null);
          }}
          onSave={handleUpdateTemplate}
          initialData={{
            name: editTemplate.name,
            displayName: editTemplate.displayName,
            description: editTemplate.description,
            content: editTemplate.content,
            category: editTemplate.category,
            variables: editTemplate.variables || [],
          }}
        />
      )}

      {/* Create Modal */}
      <VariableEditModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateTemplate}
      />
    </div>
  );
};

export default PromptTemplateSelector;
