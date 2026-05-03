/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module pages/PromptTemplates/PromptTemplates
 * @description Full Prompt Templates management page.
 *
 * Features:
 * - List all prompt templates with filtering and search
 * - Create / Edit / Delete templates
 * - Test / Validate / Render a template with variable inputs
 * - Category stats and distribution chart
 * - Variable inspector per template
 * - Built-in / default badge support
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Code,
  CopyCheck,
  Database,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Hash,
  LayoutGrid,
  List,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  createPromptTemplate,
  deletePromptTemplate,
  getPromptTemplateById,
  getPromptTemplateCategories,
  listPromptTemplates,
  type PromptTemplate,
  type PromptTemplateCreateInput,
  type PromptTemplateRenderInput,
  type PromptTemplateRenderOutput,
  type PromptTemplateUpdateInput,
  renderPromptTemplate,
  setDefaultPromptTemplate,
  updatePromptTemplate,
} from '@/lib/api.js';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Label} from '@/components/ui/Label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertTitle,
} from '@/components/ui/Alert';
import {Switch} from '@/components/ui/Switch';
import Separator from '@/components/ui/Separator';
import {Checkbox} from '@/components/ui/Checkbox';
import JsonViewer from '@/components/ui/JsonViewer';
import CodeEditor from '@/components/ui/CodeEditor';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/Tooltip';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/Select';

import {cn} from '@/lib/utils';
import {ScrollArea} from '@/components/ui/ScrollArea';
import {AdvancedTextarea} from '@/components/ui/AdvancedTextarea';
import {AdvancedInput} from '@/components/ui/AdvanceInput';

// ─── Types ────────────────────────────────────────────────────────────────────────

/**
 * Statistics summary for the prompt templates' dashboard.
 * Aggregates counts and metadata about the current template collection.
 */
interface Stats {
  /** Total number of templates available. */
  total: number;
  /** Count of templates grouped by their category name. */
  byCategory: Record<string, number>;
  /** Number of templates marked as built-in. */
  builtIn: number;
  /** Number of user-created custom templates. */
  custom: number;
  /** Number of templates marked as default. */
  defaultCount: number;
  /** Total number of unique variables defined across all templates. */
  variables: number;
  /** ISO timestamp of the most recent update to any template. */
  lastUpdated: string;
}

/**
 * Represents a variable field definition used in forms or testing.
 * This interface is currently unused but reserved for future form handling logic.
 */
interface VariableField {
  /** The unique identifier for the variable (e.g., 'user_name'). */
  name: string;
  /** Human-readable description of what the variable represents. */
  description: string;
  /** Whether the variable must be provided during rendering. */
  required: boolean;
  /** The current value assigned to the variable. */
  value: string;
}

/** Display mode for the template list. */
type ViewMode = 'grid' | 'list';

/** Fields available for sorting the template list. */
type SortField = 'name' | 'displayName' | 'updatedAt' | 'category';

/** Direction for sorting the template list. */
type SortDir = 'asc' | 'desc';

// ─── Color palette for category chart ───────────────────────────────────────────────

const CATEGORY_COLORS = [
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
const getColorForIndex = (i: number): string => CATEGORY_COLORS[i % CATEGORY_COLORS.length];

// ─── Sub-components ─────────────────────────────────────────────────────────────────

/**
 * Props for the CategoryChart component.
 */
interface CategoryChartProps {
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

/**
 * Props for the VariablesWidget component.
 */
interface VariablesWidgetProps {
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
                {v.name}

              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{v.description} {v.required && <span className="text-[11px]">(required)</span>}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
};

/**
 * Props for the MiniStat component.
 */
interface MiniStatProps {
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

// ─── Main Page ──────────────────────────────────────────────────────────────────────

const PromptTemplates: React.FC = () => {
  // State
  /** List of all loaded prompt templates. */
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  /** Loading state for async operations. */
  const [loading, setLoading] = useState(false);
  /** Error message string, if any. */
  const [error, setError] = useState('');
  /** Success message string, if any. */
  const [successMessage, setSuccessMessage] = useState('');

  // Stats
  /** Aggregated statistics about the templates. */
  const [stats, setStats] = useState<Stats>({
    total: 0,
    byCategory: {},
    builtIn: 0,
    custom: 0,
    defaultCount: 0,
    variables: 0,
    lastUpdated: '',
  });

  // Categories
  /** List of unique category names available for filtering. */
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Filters
  /** Current search query string. */
  const [searchQuery, setSearchQuery] = useState<string>('');
  /** Currently selected category filter ('all' for no filter). */
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  /** Whether to show built-in templates. */
  const [showBuiltIn, setShowBuiltIn] = useState<boolean>(false);
  /** Whether to show default templates. */
  const [showDefault, setShowDefault] = useState<boolean>(false);
  /** ID of the template for which variable details are currently expanded. */
  const [showVariables, setShowVariables] = useState<string | null>(null);

  // View mode / sort
  /** Current display mode for the template list. */
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  /** Field currently used for sorting. */
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  /** Current sort direction. */
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Dialog state
  /** Controls the visibility of the Create/Edit dialog. */
  const [createEditOpen, setCreateEditOpen] = useState<boolean>(false);
  /** Flag indicating if the dialog is in edit mode. */
  const [isEditing, setIsEditing] = useState<boolean>(false);
  /** The template object currently being edited. */
  const [editTemplate, setEditTemplate] = useState<PromptTemplate | null>(null);
  /** Controls the visibility of the Delete confirmation dialog. */
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  /** The template object currently targeted for deletion. */
  const [deleteTarget, setDeleteTarget] = useState<PromptTemplate | null>(null);
  /** Controls the visibility of the Render/Test dialog. */
  const [renderOpen, setRenderOpen] = useState<boolean>(false);
  /** Key-value pairs of variable inputs for testing. */
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});
  /** The output object from the last render operation. */
  const [renderOutput, setRenderOutput] = useState<PromptTemplateRenderOutput | null>(null);
  /** Loading state specifically for the render operation. */
  const [renderLoading, setRenderLoading] = useState<boolean>(false);

  // ─── Fetch ────────────────────────────────────────────────────────────────────

  /**
   * Fetches the list of templates and available categories from the API.
   * Updates the local state with the results.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listRes, catRes] = await Promise.all([
        listPromptTemplates(),
        getPromptTemplateCategories(),
      ]);
      setTemplates(listRes.templates);
      setAvailableCategories(catRes.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Stats computation ──────────────────────────────────────────────────────────

  /**
   * Computes statistics based on the current list of templates.
   * Updates the `stats` state whenever the `templates` state changes.
   */
  useEffect(() => {
    const byCategory: Record<string, number> = {};
    let builtIn = 0,
      custom = 0,
      defaultCount = 0,
      variables = 0;
    let lastUpdated = '';

    templates.forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      if (t.isBuiltIn) builtIn++;
      else custom++;
      if (t.isDefault) defaultCount++;
      variables += t.variables.length;
      if (!lastUpdated || t.updatedAt > lastUpdated) lastUpdated = t.updatedAt;
    });

    setStats({
      total: templates.length,
      byCategory,
      builtIn,
      custom,
      defaultCount,
      variables,
      lastUpdated,
    });
  }, [templates]);

  // ─── Filtering + sorting ────────────────────────────────────────────────────────

  /**
   * Memoized list of templates that have been filtered and sorted
   * based on the current state of search, filters, and sort options.
   */
  const filteredAndSorted = useMemo(() => {
    const result = templates.filter((t) => {
      const matchesSearch =
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      const matchesBuiltIn = showBuiltIn || !t.isBuiltIn;
      const matchesDefault = showDefault || !t.isDefault;
      return matchesSearch && matchesCategory && matchesBuiltIn && matchesDefault;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'displayName') cmp = a.displayName.localeCompare(b.displayName);
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
      else if (sortField === 'updatedAt') cmp = a.updatedAt.localeCompare(b.updatedAt);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [templates, searchQuery, selectedCategory, showBuiltIn, showDefault, sortField, sortDir]);

  // No extra categories computation needed — availableCategories is already populated from the API

  // ─── Handlers ───────────────────────────────────────────────────────────────────

  /**
   * Opens the create dialog in "create mode".
   * Resets form state and editing flags.
   */
  const handleCreate = () => {
    setIsEditing(false);
    setEditTemplate(null);
    setCreateEditOpen(true);
  };

  /**
   * Opens the create/edit dialog in "edit mode".
   * Fetches full details for the selected template before opening.
   *
   * @param template - The template to edit.
   */
  const handleEdit = async (template: PromptTemplate) => {
    try {
      const detail = await getPromptTemplateById(template.id);
      setEditTemplate(detail);
      setIsEditing(true);
      setCreateEditOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    }
  };

  /**
   * Opens the delete confirmation dialog.
   *
   * @param template - The template to delete.
   */
  const handleDelete = async (template: PromptTemplate) => {
    setDeleteTarget(template);
    setDeleteConfirmOpen(true);
  };

  /**
   * Performs the actual deletion of the template.
   * Updates the local state and shows a success message.
   */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePromptTemplate(deleteTarget.id);
      setSuccessMessage(`Template "${deleteTarget.displayName}" deleted`);
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  /**
   * Saves the template data, either creating a new one or updating an existing one.
   *
   * @param data - The form data to save.
   */
  const handleSave = async (data: PromptTemplateCreateInput | PromptTemplateUpdateInput) => {
    if (isEditing && editTemplate) {
      await updatePromptTemplate(editTemplate.id, data as PromptTemplateUpdateInput);
      setSuccessMessage(`Template "${(data as PromptTemplateUpdateInput).displayName ?? editTemplate.displayName}" updated`);
    } else {
      await createPromptTemplate(data as PromptTemplateCreateInput);
      setSuccessMessage(`Template "${(data as PromptTemplateCreateInput).displayName}" created`);
    }
    await fetchData();
    setCreateEditOpen(false);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  /**
   * Sets a specific template as the default.
   * Updates local state to reflect the change immediately.
   *
   * @param template - The template to set as default.
   */
  const handleSetDefault = async (template: PromptTemplate) => {
    try {
      await setDefaultPromptTemplate(template.id);
      setTemplates((prev) => prev.map((t) => ({
        ...t,
        isDefault: t.id === template.id,
      })));
      setSuccessMessage(`Template "${template.displayName}" set as default`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default');
    }
  };

  /**
   * Opens the render/test dialog.
   * Resets test variables and previous output.
   *
   * @param template - The template to test.
   */
  const handleTest = (template: PromptTemplate) => {
    setEditTemplate(template);
    setIsEditing(true);
    setTestVariables({});
    setRenderOutput(null);
    setRenderOpen(true);
  };

  /**
   * Calls the API to render the template with the provided test variables.
   */
  const handleRender = async () => {
    if (!editTemplate) {
      setError('No template selected for rendering.');
      return;
    }
    setRenderLoading(true);
    try {
      const input: PromptTemplateRenderInput = {
        id: editTemplate.id,
        variables: testVariables,
      };
      const result = await renderPromptTemplate(input);
      setRenderOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Render failed');
    } finally {
      setRenderLoading(false);
    }
  };

  /**
   * Copies the rendered content to the user's clipboard.
   */
  const handleCopyRendered = async () => {
    if (!renderOutput?.renderedContent) return;
    try {
      await navigator.clipboard.writeText(renderOutput.renderedContent);
      setSuccessMessage('Copied to clipboard');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch {
      // ignore
    }
  };

  /**
   * Toggles the sort direction or changes the sort field.
   *
   * @param field - The field to sort by.
   */
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // ─── Empty form defaults ───────────────────────────────────────────────────────

  /** Default structure for a new template form. */
  const emptyForm: PromptTemplateCreateInput = {
    name: '',
    displayName: '',
    description: '',
    content: '',
    category: 'general',
    variables: [],
    settings: {},
    isDefault: false,
  };
  /** State representing the current values in the create/edit form. */
  const [formState, setFormState] = useState<PromptTemplateCreateInput>(emptyForm);

  /**
   * Populates the form state with data from an existing template.
   *
   * @param t - The template to load into the form.
   */
  const applyFormStateFromTemplate = (t: PromptTemplate) => {
    setFormState({
      name: t.name,
      displayName: t.displayName,
      description: t.description,
      content: t.content,
      category: t.category,
      variables: t.variables,
      settings: t.settings ?? {},
      isDefault: t.isDefault,
    });
  };

  useEffect(() => {
    if (createEditOpen) {
      if (isEditing && editTemplate) applyFormStateFromTemplate(editTemplate);
      else setFormState(emptyForm);
    }
    // eslint-disable-next-line
  }, [createEditOpen, isEditing, editTemplate]);

  // ─── Render ─────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary"/>
            Prompt Templates
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage, test, validate, and render prompt templates
          </p>
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={fetchData} variant="outline" size="sm">
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')}/>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh templates</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="destructive" size="sm" onClick={handleCreate}>
                  <Plus className="h-4 w-4"/>
                  Create Template
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Create a new prompt template</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* ── Stats Cards ────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <MiniStat
          title="Total Templates"
          value={stats.total}
          icon={FileText}
        />
        <MiniStat
          title="Built-in"
          value={stats.builtIn}
          icon={Sparkles}
          color="text-violet-600"
        />
        <MiniStat
          title="Custom"
          value={stats.custom}
          icon={Code}
          color="text-emerald-600"
        />
        <MiniStat
          title="Defaults"
          value={stats.defaultCount}
          icon={Star}
          color="text-amber-600"
        />
        <MiniStat
          title="Total Variables"
          value={stats.variables}
          icon={Database}
          color="text-sky-600"
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryChart stats={stats}/>
          </CardContent>
        </Card>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────────────────── */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4"/>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600"/>
          <AlertTitle className="text-emerald-800 dark:text-emerald-300">Success</AlertTitle>
          <AlertDescription className="text-emerald-700 dark:text-emerald-300">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* ── Filters Card ───────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Row 1: search + category */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
                <AdvancedInput
                  placeholder="Search templates by name, display name, or description…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-3"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger
                  className="w-[180px] h-[40px] inline-flex items-center justify-between gap-1 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <SelectTrigger
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background h-10 w-10 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  {viewMode === 'grid' ? <LayoutGrid className="h-4 w-4"/> : <List className="h-4 w-4"/>}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid"><LayoutGrid className="h-4 w-4 inline"/> Grid</SelectItem>
                  <SelectItem value="list"><List className="h-4 w-4 inline"/> List</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 2: toggles */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Filter className="h-3.5 w-3.5"/>Filters:
              </span>
              <Button
                variant={showBuiltIn ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowBuiltIn(!showBuiltIn)}
              >
                {showBuiltIn ? <Eye className="mr-1 h-3.5 w-3.5"/> : <EyeOff className="mr-1 h-3.5 w-3.5"/>}
                Built-in
              </Button>
              <Button
                variant={showDefault ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowDefault(!showDefault)}
              >
                {showDefault ? <Eye className="mr-1 h-3.5 w-3.5"/> : <EyeOff className="mr-1 h-3.5 w-3.5"/>}
                Default
              </Button>

              {/* Sort controls */}
              <Separator className="h-6"/>
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <ArrowUpDown className="h-3.5 w-3.5"/>Sort:
              </span>
              {(['displayName', 'name', 'category', 'updatedAt'] as SortField[]).map((field) => (
                <Button
                  key={field}
                  variant={sortField === field ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => toggleSort(field)}
                  className="text-xs"
                >
                  {field === 'updatedAt' ? 'Last Updated' : field}
                  {sortField === field && (
                    sortDir === 'asc' ? <ChevronUp className="ml-1 h-3 w-3"/> : <ChevronDown className="ml-1 h-3 w-3"/>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Template List / Grid ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-10 w-10 animate-spin text-primary"/>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground"/>
          <h3 className="mt-4 text-lg font-semibold">No templates found</h3>
          <p className="text-muted-foreground mt-2">
            {searchQuery || selectedCategory !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Create your first template to get started.'}
          </p>
          {!searchQuery && selectedCategory === 'all' && (
            <Button className="mt-4" onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4"/>
              Create Template
            </Button>
          )}
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSorted.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={() => handleEdit(t)}
              onDelete={() => handleDelete(t)}
              onSetDefault={() => handleSetDefault(t)}
              onTest={() => handleTest(t)}
              variablesExpanded={showVariables === String(t.id)}
              onToggleVariables={() => setShowVariables((prev) => (prev === String(t.id) ? null : String(t.id)))}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* List header */}
          <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-4">
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Variables</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Updated</div>
            <div className="col-span-1"></div>
          </div>
          {filteredAndSorted.map((t) => (
            <TemplateListItem
              key={t.id}
              template={t}
              onEdit={() => handleEdit(t)}
              onDelete={() => handleDelete(t)}
              onSetDefault={() => handleSetDefault(t)}
              onTest={() => handleTest(t)}
            />
          ))}
        </div>
      )}

      {/* ── Create / Edit Dialog ───────────────────────────────────────────────── */}
      <Dialog open={createEditOpen} onOpenChange={setCreateEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? `Editing "${editTemplate?.displayName}"`
                : 'Fill in the details for your new prompt template.'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[700px]">
            <div className="space-y-4 p-1 pr-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name <span className="text-red-500">*</span></Label>
                  <AdvancedInput
                    value={formState.name}
                    onChange={(e) => setFormState((s) => ({...s, name: e.target.value}))}
                    placeholder="my_template"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Display Name <span className="text-red-500">*</span></Label>
                  <AdvancedInput
                    value={formState.displayName}
                    onChange={(e) => setFormState((s) => ({...s, displayName: e.target.value}))}
                    placeholder="My Template"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <AdvancedTextarea
                  value={formState.description}
                  onChange={value => setFormState((s) => ({...s, description: value}))}
                  placeholder="What does this template do?"
                  rows={2}
                  autoResize={false}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formState.category}
                    onValueChange={v => setFormState((s) => ({...s, category: v}))}
                  >
                    <SelectTrigger
                      className="w-full inline-flex items-center justify-between gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 mt-2">
                    <Star className="h-3.5 w-3.5"/>Default
                  </Label>
                  <div className="flex items-center gap-2 pt-3">
                    <Switch
                      checked={!!formState.isDefault}
                      onCheckedChange={(v) => setFormState((s) => ({...s, isDefault: v}))}
                    />
                    <span className="text-sm text-muted-foreground">
                    {formState.isDefault ? 'Yes' : 'No'}
                  </span>
                  </div>
                </div>
              </div>

              <Separator/>

              {/* Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Template Content</Label>
                  <Badge variant="outline" className="text-xs">
                    {{content: '1'}.content.length} chars
                  </Badge>
                </div>
                <CodeEditor
                  value={formState.content}
                  onChange={(v) => setFormState((s) => ({...s, content: v}))}
                  language="markdown"
                  heightClass="h-[200px]"
                />
              </div>

              <Separator/>

              {/* Variables */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Variables</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFormState((s) => ({
                        ...s,
                        variables: [...s.variables, {name: '', description: '', required: false}],
                      }))
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5"/>Add Variable
                  </Button>
                </div>
                {formState.variables.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Name</Label>
                      <AdvancedInput
                        onClearClick={() => {
                          const vars = [...formState.variables!];
                          vars[idx] = {...v, name: ''};
                          setFormState((s) => ({...s, variables: vars}));
                        }}
                        value={v.name}
                        onChange={(e) => {
                          const vars = [...formState.variables!];
                          vars[idx] = {...v, name: e.target.value};
                          setFormState((s) => ({...s, variables: vars}));
                        }}
                        placeholder="var_name"
                      />
                    </div>
                    <div className="col-span-6 space-y-1">
                      <Label className="text-xs">Description</Label>
                      <AdvancedInput
                        onClearClick={() => {
                          const vars = [...formState.variables!];
                          vars[idx] = {...v, description: ''};
                          setFormState((s) => ({...s, variables: vars}));
                        }}
                        value={v.description}
                        onChange={(e) => {
                          const vars = [...formState.variables!];
                          vars[idx] = {...v, description: e.target.value};
                          setFormState((s) => ({...s, variables: vars}));
                        }}
                        placeholder="What is this variable?"
                      />
                    </div>
                    <div className="col-span-3 flex gap-3">
                      <div className="flex">
                        <Checkbox
                          checked={v.required}
                          onCheckedChange={(checked) => {
                            const vars = [...formState.variables!];
                            vars[idx] = {...v, required: !!checked};
                            setFormState((s) => ({...s, variables: vars}));
                          }}
                        />
                        <Label className="text-xs ml-1">Required</Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setFormState((s) => ({
                            ...s,
                            variables: s.variables!.filter((_, i) => i !== idx),
                          }))
                        }
                        className="text-red-500 relative top-[-8px]"
                      >
                        <X className="h-4 w-4"/>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleSave(formState)}>
              {isEditing ? <Edit className="mr-2 h-4 w-4"/> : <Plus className="mr-2 h-4 w-4"/>}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────────────────────────────────── */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.displayName}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4"/>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Render / Test Dialog ───────────────────────────────────────────────── */}
      <Dialog open={renderOpen} onOpenChange={setRenderOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-emerald-500"/>
              Test &amp; Render Template
            </DialogTitle>
            <DialogDescription>
              {isEditing ? editTemplate?.displayName : ''}
              {' · '}
              {isEditing ? editTemplate?.name : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Variable inputs */}
            <div className="space-y-2">
              <Label>Variables</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {isEditing && editTemplate && editTemplate.variables.map((v) => (
                  <div key={v.name} className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      <Hash className="h-3 w-3"/>
                      {v.name}
                      {v.required && <span className="text-red-500">*</span>}
                    </Label>
                    <AdvancedInput
                      value={testVariables[v.name] ?? ''}
                      onChange={e =>
                        setTestVariables((prev) => ({...prev, [v.name]: e.target.value}))
                      }
                      placeholder={v.description || ''}
                      className={cn((v.required && !testVariables?.[v.name]?.length) && 'border-orange-300 dark:border-orange-700')}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator/>

            {/* Render button */}
            <div className="flex justify-end">
              <Button
                onClick={handleRender}
                disabled={renderLoading}
                className="gap-2"
              >
                {renderLoading && <RefreshCw className="h-4 w-4 animate-spin"/>}
                <Sparkles className="h-4 w-4"/>
                Render
              </Button>
            </div>

            {/* Render output */}
            {renderOutput && (
              <>
                <Separator/>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Rendered Content</Label>
                    <Button variant="outline" size="sm" onClick={handleCopyRendered}>
                      <CopyCheck className="mr-1 h-3.5 w-3.5"/>Copy
                    </Button>
                  </div>
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <pre className="whitespace-pre-wrap text-sm font-mono break-words">
                      {renderOutput.renderedContent}
                    </pre>
                  </div>
                </div>
                {/* Raw content */}
                <div className="space-y-2">
                  <Label>Original Content</Label>
                  <div className="rounded-lg border bg-muted/30 p-4 max-h-60 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-xs font-mono text-muted-foreground break-words">
                      {renderOutput.content}
                    </pre>
                  </div>
                </div>
                {/* Variables used */}
                <div className="space-y-2">
                  <Label>Variables Used</Label>
                  <JsonViewer value={renderOutput.variables} collapsed={false}/>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRenderOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Template Card (Grid view) ──────────────────────────────────────────────────────

/**
 * Props for the TemplateCard component.
 */
interface TemplateCardProps {
  /** The template data to display. */
  template: PromptTemplate;
  /** Whether the variable details section is expanded. */
  variablesExpanded: boolean;

  /** Callback to edit the template. */
  onEdit(): void;

  /** Callback to delete the template. */
  onDelete(): void;

  /** Callback to set the template as default. */
  onSetDefault(): void;

  /** Callback to open the test/render dialog. */
  onTest(): void;

  /** Callback to toggle the expansion of variable details. */
  onToggleVariables(): void;
}

/**
 * Template Card component for Grid view.
 * Displays a summary of the template including name, badges, and actions.
 * Supports expanding to show variable details.
 */
const TemplateCard: React.FC<TemplateCardProps> = (props) => {
  const {template, onEdit, onDelete, onSetDefault, onTest, variablesExpanded, onToggleVariables} = props;

  return (
    <Card className="transition-all hover:shadow-md hover:border-primary/40 group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base truncate">{template.displayName}</CardTitle>
              {template.isBuiltIn && (
                <Badge variant="secondary" className="text-xs">Built-in</Badge>
              )}
              {template.isDefault && (
                <Badge variant="default" className="text-xs bg-amber-500 hover:bg-amber-600">
                  Default
                </Badge>
              )}
            </div>
            <code className="text-xs font-mono text-muted-foreground">{template.name}</code>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onSetDefault}>
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
                  <Button variant="ghost" size="icon" onClick={onEdit}>
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
                  <Button variant="ghost" size="icon" onClick={onTest}>
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
                  <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-500 hover:text-red-700">
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
        <div className="flex items-center justify-between">
          <VariablesWidget variables={template.variables}/>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVariables}
            className="text-xs h-7"
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
                    <Badge variant="outline" className="ml-1 text-[10px] border-orange-300 text-orange-600">
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

// ─── Template List Item ──────────────────────────────────────────────────────────────

/**
 * Props for the TemplateListItem component.
 */
interface TemplateListItemProps {
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
}

/**
 * Template List Item component for List view.
 * Displays a compact row representation of the template with columns for key data.
 */
const TemplateListItem: React.FC<TemplateListItemProps> = (props) => {
  const {template, onEdit, onDelete, onSetDefault, onTest} = props;

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center rounded-lg border px-4 py-3 hover:bg-muted/40 transition-colors">
      <div className="col-span-3">
        <div className="font-medium text-sm">{template.displayName}</div>
        <code className="text-xs font-mono text-muted-foreground">{template.name}</code>
      </div>
      <div className="col-span-2">
        <Badge variant="outline" className="text-xs">{template.category}</Badge>
      </div>
      <div className="col-span-2">
        <VariablesWidget variables={template.variables}/>
      </div>
      <div className="col-span-2 flex items-center gap-1">
        {template.isBuiltIn && <Badge variant="secondary" className="text-xs">Built-in</Badge>}
        {template.isDefault && <Badge variant="default" className="text-xs bg-amber-500">Default</Badge>}
      </div>
      <div className="col-span-2 text-right text-xs text-muted-foreground">
        {new Date(template.updatedAt).toLocaleDateString()}
      </div>
      <div className="col-span-1 flex items-center justify-end gap-1">
        <Button variant="plain" size="icon" onClick={onSetDefault}>
          <Star className={cn('h-4 w-4', template.isDefault && 'fill-amber-400 text-amber-500')}/>
        </Button>
        <Button variant="plain" size="icon" onClick={onEdit}>
          <Edit className="h-4 w-4"/>
        </Button>
        <Button variant="plain" size="icon" onClick={onTest}>
          <Play className="h-4 w-4 text-emerald-500"/>
        </Button>
        <Button variant="plain" size="icon" onClick={onDelete} className="text-red-500 hover:text-red-700">
          <Trash2 className="h-4 w-4"/>
        </Button>
      </div>
    </div>
  );
};

export default PromptTemplates;
