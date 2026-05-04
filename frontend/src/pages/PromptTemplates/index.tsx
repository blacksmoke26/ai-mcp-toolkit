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

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code,
  CopyCheck,
  CopySlash,
  Database,
  Download,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Filter,
  FolderDown,
  FolderOpen,
  FolderUp,
  Hash,
  Info,
  LayoutGrid,
  List,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Star,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import {
  bulkDeletePromptTemplates,
  clonePromptTemplate,
  createPromptTemplate,
  deletePromptTemplate,
  exportPromptTemplates,
  extractPromptTemplateVariables,
  fetchSampleTemplates,
  getPromptTemplateById,
  getPromptTemplateCategories,
  getPromptTemplateStats,
  importPromptTemplates,
  listPromptTemplates,
  type PromptTemplate,
  type PromptTemplateCloneInput,
  type PromptTemplateCreateInput,
  type PromptTemplateExportInput,
  type PromptTemplateExtractVariablesOutput,
  type PromptTemplateImportInput,
  type PromptTemplateImportTemplate,
  type PromptTemplateRenameCategoryInput,
  type PromptTemplateRenderInput,
  type PromptTemplateRenderOutput,
  type PromptTemplateStats,
  type PromptTemplateUpdateInput,
  type PromptTemplateValidateInput,
  renamePromptTemplateCategory,
  renderPromptTemplate,
  type SampleTemplate,
  setDefaultPromptTemplate,
  updatePromptTemplate,
  validatePromptTemplate,
} from '@/lib/api.js';
import {DocTooltip} from '@/components/ui/DocTooltip';
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
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/Select';
import {ScrollArea} from '@/components/ui/ScrollArea';
import {AdvancedTextarea} from '@/components/ui/AdvancedTextarea';
import {AdvancedInput} from '@/components/ui/AdvanceInput';
//import CategoryChart from './CategoryChart';
import MiniStat from './MiniStat';
import TemplateListItem from './TemplateListItem';
import TemplateCard from './TemplateCard';

import {cn} from '@/lib/utils';
import type {
  BulkDeleteResult,
  ImportResult,
  SortDir,
  SortField,
  Stats,
  ValidationResult,
  ViewMode,
} from './types';

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

  // ── Bulk Selection State ──
  /** Set of selected template IDs for bulk operations. */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllOpen, setSelectAllOpen] = useState(false);

  // ── Stats State ──
  /** Aggregated statistics from backend stats endpoint. */
  const [statsData, setStatsData] = useState<PromptTemplateStats | null>(null);

  // ── Validation State ──
  /** Current validation result for template content. */
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  /** Debounce timer for validation. */
  const validationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Bulk Delete Dialog ──
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteResult, setBulkDeleteResult] = useState<BulkDeleteResult | null>(null);

  // ── Import Dialog ──
  const [importOpen, setImportOpen] = useState(false);
  const [importFileContent, setImportFileContent] = useState('');
  const [importStrategy, setImportStrategy] = useState<'skip' | 'overwrite' | 'rename'>('rename');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  // ── Export Loading ──
  const [exportLoading, setExportLoading] = useState(false);

  // ── Clone Dialog ──
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneTarget, setCloneTarget] = useState<PromptTemplate | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [cloneLoading, setCloneLoading] = useState(false);

  // ── Rename Category Dialog ──
  const [renameCatOpen, setRenameCatOpen] = useState(false);
  const [renameCatSource, setRenameCatSource] = useState('');
  const [renameCatTarget, setRenameCatTarget] = useState('');
  const [renameCatLoading, setRenameCatLoading] = useState(false);

  // View mode / sort
  /** Current display mode for the template list. */
  const [viewMode, setViewMode] = useState<ViewMode>('list');
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
  /** Validation errors for the create/edit form. */
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Samples Dialog State ───────────────
  /** Controls the visibility of the Import from Samples dialog. */
  const [samplesOpen, setSamplesOpen] = useState<boolean>(false);
  /** List of sample templates fetched from the API. */
  const [samples, setSamples] = useState<SampleTemplate[]>([]);
  /** Search query for filtering samples. */
  const [samplesSearch, setSamplesSearch] = useState<string>('');
  /** Currently selected sample template for prefilling. */
  const [selectedSample, setSelectedSample] = useState<SampleTemplate | null>(null);
  /** Loading state for the samples fetch operation. */
  const [samplesLoading, setSamplesLoading] = useState<boolean>(false);
  /** Flag to prevent the create/edit useEffect from resetting form state when importing from samples. */
  const [fromSamples, setFromSamples] = useState<boolean>(false);
  /** Toggle for settings JSON preview in the create/edit dialog. */
  const [settingsPreviewOpen, setSettingsPreviewOpen] = useState(false);

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
   * Fetches the list of templates, available categories, and stats from the API.
   * Updates the local state with the results.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const [listRes, catRes, statsRes] = await Promise.all([
        listPromptTemplates(),
        getPromptTemplateCategories(),
        getPromptTemplateStats(),
      ]);
      setTemplates(listRes.templates);
      setAvailableCategories(catRes.categories);
      setStatsData(statsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  /**
   * Memoized list of templates that have been filtered and sorted
   * based on the current state of search, filters, and sort options.
   */
  /**
   * Debounced auto-validate template content whenever it changes.
   */
  const validateContent = useCallback(async () => {
    if (!formState.content || !createEditOpen || isEditing) return;
    if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
    validationTimerRef.current = setTimeout(async () => {
      try {
        const input: PromptTemplateValidateInput = {
          content: formState.content,
          variables: formState.variables,
        };
        const result = await validatePromptTemplate(input);
        setValidationResult(result);
      } catch {
        // Validation errors handled silently
      }
    }, 500);
    return () => {
      if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
    };
  }, [formState.content, formState.variables, createEditOpen, isEditing]);

  // ── Form Validation ──
  interface FormValidationError {
    field: string;
    message: string;
  }

  const validateForm = useCallback((): FormValidationError[] => {
    const errors: FormValidationError[] = [];

    // Name validation
    if (!formState.name?.trim()) {
      errors.push({field: 'name', message: 'Name is required'});
    } else if (!/^[a-z0-9_]+$/.test(formState.name)) {
      errors.push({field: 'name', message: 'Name must be lowercase alphanumeric with underscores only'});
    } else if (templates.some(t => t.name === formState.name && (!isEditing || t.id !== editTemplate?.id))) {
      errors.push({field: 'name', message: 'Name already exists'});
    }

    // Display name validation
    if (!formState.displayName?.trim()) {
      errors.push({field: 'displayName', message: 'Display name is required'});
    }

    // Content validation
    if (!formState.content?.trim()) {
      errors.push({field: 'content', message: 'Content is required'});
    }

    // Variable name validation (no duplicates)
    if (formState.variables) {
      const varNames = formState.variables.map(v => v.name).filter(Boolean);
      const uniqueNames = new Set(varNames);
      if (uniqueNames.size !== varNames.length) {
        errors.push({field: 'variables', message: 'Variable names must be unique'});
      }
      // Check for reserved names
      const reservedNames = ['id', 'name', 'content', 'template', 'variables', 'context', 'system', 'prompt'];
      const reserved = varNames.filter(n => reservedNames.includes(n.toLowerCase()));
      if (reserved.length > 0) {
        errors.push({field: 'variables', message: `Variable names cannot be reserved: ${reserved.join(', ')}`});
      }
    }

    // Settings validation (keys must be non-empty strings)
    if (formState.settings) {
      Object.entries(formState.settings).forEach(([key, value]) => {
        if (!key || !key.trim()) {
          errors.push({field: 'settings', message: 'Settings key cannot be empty'});
        }
        if (value === null || value === undefined) {
          errors.push({field: 'settings', message: `Settings key "${key}" has empty value`});
        }
      });
    }

    return errors;
  }, [formState, templates, isEditing, editTemplate]);

  useEffect(() => {
    const cleanup = validateContent();
    return () => {
      if (cleanup) cleanup.then(c => c?.());
    };
  }, [validateContent]);

  /**
   * Auto-extract variables from content whenever it changes during create/edit.
   */
  const extractTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (extractTimerRef.current) clearTimeout(extractTimerRef.current);
    if (!formState.content || !createEditOpen || isEditing) return;
    extractTimerRef.current = setTimeout(async () => {
      try {
        const result: PromptTemplateExtractVariablesOutput = await extractPromptTemplateVariables({content: formState.content});
        if (result.count > 0 && (!formState.variables || formState.variables.length === 0)) {
          setFormState((s) => ({
            ...s,
            variables: result.variables.map((name) => ({name, description: '', required: false})),
          }));
        }
      } catch {
        // Silent fail
      }
    }, 800);
    return () => {
      if (extractTimerRef.current) clearTimeout(extractTimerRef.current);
    };
    // eslint-disable-next-line
  }, [formState.content, createEditOpen, isEditing]);

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
    // Run form validation and display errors inline
    const errors = validateForm();
    if (errors.length > 0) {
      const errorMap: Record<string, string> = {};
      errors.forEach((e) => {
        errorMap[e.field] = e.message;
      });
      setFormErrors(errorMap);
      return;
    }
    setFormErrors({});

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
  /**
   * Toggles selection of a template for bulk operations.
   */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /**
   * Selects all visible templates.
   */
  const selectAll = () => {
    setSelectedIds(new Set(filteredAndSorted.map((t) => String(t.id))));
  };

  /**
   * Deselects all templates.
   */
  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  /**
   * Opens the clone dialog for a template.
   */
  const handleClone = async (template: PromptTemplate) => {
    setCloneTarget(template);
    setCloneName(`${template.name}_copy`);
    setCloneLoading(false);
    setCloneTarget(template);
    setCloneOpen(true);
  };

  /**
   * Executes the clone operation.
   */
  const confirmClone = async () => {
    if (!cloneTarget) return;
    setCloneLoading(true);
    try {
      const input: PromptTemplateCloneInput = cloneName ? {name: cloneName} : {};
      const result = await clonePromptTemplate(cloneTarget.id, input);
      setSuccessMessage(`Template cloned as "${result.template.displayName}"`);
      setCloneOpen(false);
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone template');
    } finally {
      setCloneLoading(false);
    }
  };

  /**
   * Executes bulk deletion of selected templates.
   */
  const confirmBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleteOpen(false);
    try {
      const result = await bulkDeletePromptTemplates({ids});
      setBulkDeleteResult(result);
      setTemplates((prev) => prev.filter((t) => !ids.includes(String(t.id))));
      setSelectedIds(new Set());
      setTimeout(() => setBulkDeleteResult(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk delete failed');
    }
  };

  /**
   * Opens the import dialog.
   */
  const handleOpenImport = () => {
    setImportFileContent('');
    setImportStrategy('rename');
    setImportResult(null);
    setImportOpen(true);
  };

  /**
   * Executes the import operation.
   */
  const confirmImport = async () => {
    if (!importFileContent.trim()) return;
    setImportLoading(true);
    try {
      const parsed = JSON.parse(importFileContent);
      const templates: PromptTemplateImportTemplate[] = Array.isArray(parsed) ? parsed : parsed.templates;
      if (!Array.isArray(templates) || templates.length === 0) {
        setError('Invalid import format. Expected an array of templates.');
        return;
      }
      const input: PromptTemplateImportInput = {templates, strategy: importStrategy};
      const result = await importPromptTemplates(input);
      setImportResult(result);
      setTimeout(() => setImportOpen(false), 2000);
      setTimeout(() => setImportResult(null), 4000);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  /**
   * Exports selected templates (or all if none selected) as JSON.
   */
  const handleExport = async () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
    setExportLoading(true);
    try {
      const input: PromptTemplateExportInput = ids ? {ids} : {};
      const result = await exportPromptTemplates(input);
      const jsonStr = JSON.stringify(result.templates, null, 2);
      const blob = new Blob([jsonStr], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt-templates-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccessMessage(`Exported ${result.count} templates`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExportLoading(false);
    }
  };

  /**
   * Opens the rename category dialog.
   */
  const handleRenameCategory = (currentCategory: string) => {
    setRenameCatOpen(true);
    setRenameCatSource(currentCategory);
    setRenameCatTarget('');
  };

  /**
   * Executes the category rename.
   */
  const confirmRenameCategory = async () => {
    if (!renameCatSource || !renameCatTarget || renameCatSource === renameCatTarget) return;
    setRenameCatLoading(true);
    try {
      const input: PromptTemplateRenameCategoryInput = {oldName: renameCatSource, newName: renameCatTarget};
      const result = await renamePromptTemplateCategory(input);
      setSuccessMessage(`Renamed ${renameCatSource} → ${renameCatTarget} (${result.count} templates)`);
      setRenameCatOpen(false);
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename category failed');
    } finally {
      setRenameCatLoading(false);
    }
  };

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

  // ─── Samples Dialog Handlers ───────────

  /**
   * Opens the samples dialog and fetches available sample templates.
   */
  const handleOpenSamples = async () => {
    setSelectedSample(null);
    setSamplesSearch('');
    setSamplesOpen(true);
    setSamplesLoading(true);
    try {
      const res = await fetchSampleTemplates();
      setSamples(res.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load samples');
    } finally {
      setSamplesLoading(false);
    }
  };

  /**
   * Imports the selected sample template into the create form.
   */
  const handleSelectSample = () => {
    if (!selectedSample) return;
    setFromSamples(true);
    setFormState({
      name: selectedSample.name,
      displayName: selectedSample.displayName,
      description: selectedSample.description,
      content: selectedSample.content,
      category: 'general',
      variables: selectedSample.variables,
      settings: {},
      isDefault: false,
    });
    setIsEditing(false);
    setEditTemplate(null);
    setSamplesOpen(false);
    setCreateEditOpen(true);
  };

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
    if (createEditOpen && !fromSamples) {
      if (isEditing && editTemplate) applyFormStateFromTemplate(editTemplate);
      else setFormState(emptyForm);
    } else if (createEditOpen && fromSamples) {
      setFromSamples(false);
    }
    if (!createEditOpen) setFormErrors({});
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
            <DocTooltip
              content={
                <div className="space-y-2">
                  <p className="text-xs">Full CRUD management for prompt templates.</p>
                  <ul className="text-xs list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-400">
                    <li>Create, edit, delete templates</li>
                    <li>Bulk operations (select &amp; delete)</li>
                    <li>Export/import JSON backup</li>
                    <li>Test &amp; render with variables</li>
                    <li>Auto-validate content &amp; extract variables</li>
                    <li>Clone &amp; rename categories</li>
                  </ul>
                  <DocTooltip content="https://github.com/blacksmoke26/ai-mcp-server" title="API Reference"
                              placement="top">
                    <span className="text-xs text-blue-500 hover:underline cursor-pointer">API Reference</span>
                  </DocTooltip>
                </div>
              }
              title="Prompt Templates"
              variant="info"
            >
              <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center cursor-help">
                <Info className="h-3 w-3 text-primary"/>
              </span>
            </DocTooltip>
          </h2>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            Manage, test, validate, and render prompt templates
            {statsData && (
              <DocTooltip
                content={
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Live Stats</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                      <span>Total:</span><span className="font-mono">{statsData.total}</span>
                      <span>Built-in:</span><span className="font-mono">{statsData.builtIn}</span>
                      <span>Custom:</span><span className="font-mono">{statsData.custom}</span>
                      <span>Categories:</span><span
                      className="font-mono">{Object.keys(statsData.categories).length}</span>
                    </div>
                  </div>
                }
                title="Backend Statistics"
                variant="success"
              >
                <span
                  className="text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-md cursor-help">
                  {statsData.total} templates
                </span>
              </DocTooltip>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DocTooltip
            content="Refresh the template list and statistics from the backend."
            title="Refresh"
            placement="bottom"
          >
            <Button onClick={fetchData} variant="outline" size="sm" className="gap-1">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')}/>
              Refresh
            </Button>
          </DocTooltip>
          <DocTooltip
            content="Create a new custom prompt template. You can also import from samples or clone existing templates."
            title="Create Template"
            codeLanguage="http"
            placement="bottom"
          >
            <Button variant="default" size="sm" onClick={handleCreate} className="gap-1">
              <Plus className="h-4 w-4"/>
              Create
            </Button>
          </DocTooltip>
          <DocTooltip
            content="Browse and import pre-built sample templates from the MCP server's built-in samples."
            title="Import from Samples"
            placement="bottom"
          >
            <Button variant="outline" size="sm" onClick={handleOpenSamples} className="gap-1">
              <Download className="h-4 w-4"/>
              Samples
            </Button>
          </DocTooltip>
          {selectedIds.size > 0 && (
            <DocTooltip
              content={`Select ${selectedIds.size} templates for bulk operations. You can export them or delete them in bulk.`}
              title={`Bulk Selected (${selectedIds.size})`}
              variant="warning"
              placement="bottom"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectAllOpen(true)}
                className="gap-1 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
              >
                <Trash2 className="h-4 w-4"/>
                {selectedIds.size}
              </Button>
            </DocTooltip>
          )}
          <DocTooltip
            content="Export selected templates (or all if none selected) as a JSON file for backup or sharing."
            codeLanguage="http"
            title="Export Templates"
            placement="bottom"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exportLoading}
              className="gap-1"
            >
              {exportLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <FolderDown className="h-4 w-4"/>}
              Export
            </Button>
          </DocTooltip>
          <DocTooltip
            content="Import templates from a JSON file. Choose a conflict strategy: skip existing, overwrite, or rename on conflict."
            codeLanguage="http"
            title="Import Templates"
            placement="bottom"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenImport}
              disabled={importLoading}
              className="gap-1"
            >
              <FolderUp className="h-4 w-4"/>
              Import
            </Button>
          </DocTooltip>
        </div>
      </div>

      {/* ── Stats Cards ────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MiniStat
          title="Total Templates"
          value={statsData?.total ?? stats.total}
          icon={FileText}
        />
        <MiniStat
          title="Built-in"
          value={statsData?.builtIn ?? stats.builtIn}
          icon={Sparkles}
          color="text-violet-600"
        />
        <MiniStat
          title="Custom"
          value={statsData?.custom ?? stats.custom}
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
        {/*<Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            {statsData && Object.keys(statsData.categories).length > 0 && (
              <DocTooltip
                content={
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category Distribution</p>
                    {Object.entries(statsData.categories)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, count]) => (
                        <div key={cat} className="flex items-center justify-between text-xs">
                          <span>{cat}</span>
                          <span className="font-mono text-slate-500">{count}</span>
                        </div>
                      ))}
                  </div>
                }
                title="Category Breakdown"
                variant="info"
              >
                <span className="text-xs bg-primary/5 text-primary px-1.5 py-0.5 rounded-md cursor-help">
                  {Object.keys(statsData.categories).length} categories
                </span>
              </DocTooltip>
            )}
          </CardHeader>
          <CardContent>
            <CategoryChart stats={statsData?.categories ? {...stats, byCategory: statsData.categories} : stats}/>
          </CardContent>
        </Card>*/}
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

      {/* ── Bulk Selection Toolbar ── */}
      {filteredAndSorted.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="">
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <DocTooltip
                content={`Delete ${selectedIds.size} selected custom templates. Built-in templates will be skipped.`}
                title="Bulk Delete"
                variant="error"
                placement="bottom"
              >
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteOpen(true)}
                  className="gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5"/>
                  Delete ({selectedIds.size})
                </Button>
              </DocTooltip>
              <DocTooltip
                content={`Export ${selectedIds.size} selected templates as JSON.`}
                title="Export Selected"
                placement="bottom"
              >
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
                  <FolderDown className="h-3.5 w-3.5"/>
                  Export
                </Button>
              </DocTooltip>
              <Button variant="ghost" size="sm" onClick={deselectAll} className="gap-1 text-xs">
                <X className="h-3.5 w-3.5"/>
                Clear
              </Button>
            </div>
          )}
        </div>
      )}

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
              onClone={() => handleClone(t)}
              variablesExpanded={showVariables === String(t.id)}
              onToggleVariables={() => setShowVariables((prev) => (prev === String(t.id) ? null : String(t.id)))}
              isSelected={selectedIds.has(String(t.id))}
              onToggleSelect={() => toggleSelect(String(t.id))}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* List header */}
          <div className="hidden sm:grid grid-cols-12 gap-1 text-xs font-medium text-muted-foreground px-4">
            <div className="col-span-1"><Checkbox
              checked={selectedIds.size === filteredAndSorted.length && filteredAndSorted.length > 0}
              onCheckedChange={checked => {
                if (checked) selectAll(); else deselectAll();
              }} className="h-4 w-4"/></div>
            <div className="col-span-2">Name</div>
            <div className="col-span-1">Category</div>
            <div className="col-span-3">Variables</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1 text-right">Updated</div>
            <div className="col-span-1">&nbsp;</div>
          </div>
          {filteredAndSorted.map((t) => (
            <TemplateListItem
              key={t.id}
              template={t}
              onEdit={() => handleEdit(t)}
              onDelete={() => handleDelete(t)}
              onSetDefault={() => handleSetDefault(t)}
              onTest={() => handleTest(t)}
              onClone={() => handleClone(t)}
              isSelected={selectedIds.has(String(t.id))}
              onToggleSelect={() => toggleSelect(String(t.id))}
            />
          ))}
        </div>
      )}

      {/* ── Create / Edit Dialog ───────────────────────────────────────────────── */}
      <Dialog
        open={createEditOpen}
        onOpenChange={(open) => {
          if (!open) setValidationResult(null);
          setCreateEditOpen(open);
        }}>
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

          {/* Validation Status */}
          {validationResult && createEditOpen && !isEditing && (
            <Alert className={cn(
              validationResult.valid
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300',
            )}>
              {validationResult.valid ? <CheckCircle2 className="h-4 w-4 text-emerald-600"/> :
                <AlertTriangle className="h-4 w-4 text-amber-600"/>}
              <AlertTitle>{validationResult.valid ? 'Valid' : 'Warnings'}</AlertTitle>
              <AlertDescription className="text-xs">
                {validationResult.valid
                  ? 'Content and variables match correctly.'
                  : validationResult.errors.slice(0, 2).map((e, i) => <div key={i}>{e}</div>)}
              </AlertDescription>
            </Alert>
          )}

          <ScrollArea className="max-h-[700px]">
            <div className="space-y-4 p-1 pr-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label>Name <span className="text-red-500">*</span></Label>
                    <DocTooltip
                      content="Unique machine-readable identifier. Must be lowercase alphanumeric with underscores only. Cannot be a reserved name."
                      title="Name Guidelines" placement="top" variant="help">
                      <Info className="h-3 w-3 text-muted-foreground cursor-help"/>
                    </DocTooltip>
                  </div>
                  <AdvancedInput
                    lowercase={true}
                    charsRemainingWarning={15}
                    showCharCount={true}
                    maxLength={50}
                    value={formState.name}
                    onChange={(e) => setFormState((s) => ({...s, name: e.target.value}))}
                    placeholder="my_template"
                    className={cn(formState.name && /^[a-z0-9_]+$/.test(formState.name) ? 'border-green-500' : formState.name && !/^[a-z0-9_]+$/.test(formState.name) ? 'border-red-400' : formErrors.name ? 'border-red-400' : '')}
                  />
                  {formErrors.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label>Display Name <span className="text-red-500">*</span></Label>
                    <DocTooltip content="Human-readable name displayed in the UI." title="Display Name" placement="top">
                      <Info className="h-3 w-3 text-muted-foreground cursor-help"/>
                    </DocTooltip>
                  </div>
                  <AdvancedInput
                    value={formState.displayName}
                    onChange={(e) => setFormState((s) => ({...s, displayName: e.target.value}))}
                    placeholder="My Template"
                  />
                  {formErrors.displayName && <p className="text-xs text-red-500">{formErrors.displayName}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label>Description</Label>
                  <DocTooltip
                    content="Brief description of what this template does. Shown in list views and search results."
                    title="Description" placement="top">
                    <Info className="h-3 w-3 text-muted-foreground cursor-help"/>
                  </DocTooltip>
                </div>
                <AdvancedTextarea
                  value={formState.description}
                  onChange={value => setFormState((s) => ({...s, description: value}))}
                  placeholder="What does this template do?"
                  rows={2}
                  autoResize={false}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label>Category</Label>
                    <DocTooltip
                      content="Group templates by category. Categories help organize and filter templates."
                      title="Category" placement="top">
                      <Info className="h-3 w-3 text-muted-foreground cursor-help"/>
                    </DocTooltip>
                  </div>
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
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 mt-2">
                    <Wand2 className="h-3.5 w-3.5"/>Variables
                  </Label>
                  <div className="pt-3">
                    <Badge variant="outline" className="text-xs">
                      {formState.variables?.length ?? 0} defined
                      <Wand2 className="ml-1 h-3 w-3 text-muted-foreground"/>
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator/>

              {/* Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Label>Template Content</Label>
                    <DocTooltip
                      content="Use {{variable_name}} placeholders for dynamic content. Variables are automatically extracted from content."
                      title="Template Content" placement="top" variant="code">
                      <Info className="h-3 w-3 text-muted-foreground cursor-help"/>
                    </DocTooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    {formState.content.includes('{{') && (
                      <Badge variant="secondary"
                             className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        <Hash className="h-3 w-3 mr-1"/>
                        Variables detected
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {formState.content.length} chars
                    </Badge>
                  </div>
                </div>
                <CodeEditor
                  value={formState.content}
                  onChange={(v) => setFormState((s) => ({...s, content: v}))}
                  language="markdown"
                  heightClass="h-[200px]"
                />
                {formErrors.content && <p className="text-xs text-red-500">{formErrors.content}</p>}
              </div>

              <Separator/>

              {/* Variables */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Variables</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mr-1"
                    onClick={() =>
                      setFormState((s) => ({
                        ...s,
                        variables: [...s.variables, {name: '', description: '', required: false}],
                      }))
                    }
                  >
                    <Plus className="h-3.5 w-3.5"/>Add Variable
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
                        allowClear={false}
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
                        allowClear={false}
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
                {formState.variables.length === 0 && (
                  <p className="text-xs text-muted-foreground italic py-2">No variables defined.
                    Use {'{{'}variable_name{'}}'} in your content to auto-detect variables.</p>
                )}
              </div>

              <Separator/>

              {/* Settings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1">
                    <Settings className="h-4 w-4"/>
                    Settings
                    <DocTooltip
                      content="Optional key-value pairs for template-specific configuration. Common settings: maxTokens, temperature, topP, etc."
                      title="Template Settings" placement="top" variant="info">
                      <Info className="h-3 w-3 text-muted-foreground cursor-help"/>
                    </DocTooltip>
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mr-1"
                    onClick={() =>
                      setFormState((s) => ({
                        ...s,
                        settings: {...(s.settings || {}), [``]: ''},
                      }))
                    }
                  >
                    <Plus className="h-3.5 w-3.5"/>Add Setting
                  </Button>
                </div>
                {formState.settings && Object.keys(formState.settings).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(formState.settings).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-11 gap-2 items-end">
                        <div className="col-span-4 space-y-1">
                          <Label className="text-xs">Key</Label>
                          <AdvancedInput
                            value={key}
                            onChange={(e) => {
                              const newSettings = {...formState.settings};
                              const newKey = e.target.value;
                              const newVal = newSettings[key];
                              delete newSettings[key];
                              newSettings[newKey] = newVal;
                              setFormState((s) => ({...s, settings: newSettings}));
                            }}
                            placeholder="key"
                            allowClear={false}
                            />
                        </div>
                        <div className="col-span-6 space-y-1">
                          <Label className="text-xs">Value</Label>
                          <div className="flex gap-2">
                            <AdvancedInput
                              value={String(value ?? '')}
                              onChange={(e) => {
                                const newSettings = {...formState.settings};
                                newSettings[key] = e.target.value;
                                setFormState((s) => ({...s, settings: newSettings}));
                              }}
                              placeholder="value"
                              allowClear={false}
                            />
                            <Select
                              value={typeof value}
                              onValueChange={(v) => {
                                const newSettings = {...formState.settings};
                                if (v === 'number') newSettings[key] = Number(newSettings[key]);
                                else if (v === 'boolean') newSettings[key] = String(newSettings[key]).toLowerCase() === 'true';
                                else newSettings[key] = String(newSettings[key]);
                                setFormState((s) => ({...s, settings: newSettings}));
                              }}
                            >
                              <SelectTrigger className="w-[90px] h-[40px] text-xs">
                                <SelectValue/>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newSettings = {...formState.settings};
                              delete newSettings[key];
                              setFormState((s) => ({...s, settings: newSettings}));
                            }}
                            className="text-red-500 h-7 w-7 p-0 relative top-[-10px]"
                          >
                            <X className="h-3.5 w-3.5"/>
                          </Button>
                        </div>
                      </div>
                    ))}
                    {/* Preview JSON */}
                    <div className="mt-2">
                      <div
                        className="flex items-center gap-1 cursor-pointer text-xs text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => setSettingsPreviewOpen(!settingsPreviewOpen)}>
                        <ChevronDown
                          className={cn('h-3 w-3 transition-transform', settingsPreviewOpen && 'rotate-90')}/>
                        <span>JSON Preview</span>
                      </div>
                      {settingsPreviewOpen && (
                        <pre className="mt-2 text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto font-mono">
                          <JsonViewer value={formState.settings}/>
                        </pre>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-2">No settings defined. Add optional
                    configuration for this template.</p>
                )}
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

      {/* ── Import from Samples Dialog ────────────────────────────────────────── */}
      <Dialog open={samplesOpen} onOpenChange={setSamplesOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary"/>
              Import from Samples
            </DialogTitle>
            <DialogDescription>
              Browse {samples.length} pre-built templates and click one to prefill the form.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 px-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
              <AdvancedInput
                placeholder="Search samples…"
                value={samplesSearch}
                onChange={(e) => setSamplesSearch(e.target.value)}
                className="pl-10"
                leftIcon={<Search className="h-[16px]"/>}
              />
            </div>

            {/* Loading */}
            {samplesLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary"/>
              </div>
            ) : samples.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50"/>
                <p>No samples available.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {samples
                  .filter((s) => {
                    if (!samplesSearch) return true;
                    const q = samplesSearch.toLowerCase();
                    return s.name.toLowerCase().includes(q) ||
                      s.displayName.toLowerCase().includes(q) ||
                      s.description.toLowerCase().includes(q);
                  })
                  .map((s) => (
                    <div
                      key={s.name}
                      className={cn(
                        'rounded-lg border p-3 cursor-pointer transition-all',
                        'hover:border-primary hover:shadow-sm',
                        selectedSample?.name === s.name
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border',
                      )}
                      onClick={() => setSelectedSample(s)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold truncate">{s.displayName}</h4>
                          <code className="text-[10px] font-mono text-muted-foreground">{s.name}</code>
                        </div>
                        {selectedSample?.name === s.name && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary"/>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {s.variables.length} var{s.variables.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      {s.variables.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {s.variables.slice(0, 3).map((v) => (
                            <Badge key={v.name} variant="secondary" className="text-[10px]">
                              {v.name}
                            </Badge>
                          ))}
                          {s.variables.length > 3 && (
                            <Badge variant="secondary" className="text-[10px]">+{s.variables.length - 3}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSamplesOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSelectSample}
              disabled={!selectedSample}
              className="gap-2"
            >
              <Plus className="h-4 w-4"/>
              Import Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Clone Dialog ── */}
      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CopySlash className="h-5 w-5 text-primary"/>
              Clone Template
            </DialogTitle>
            <DialogDescription>
              Clone "{cloneTarget?.displayName}" to create a new custom template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <DocTooltip
              content="Optional custom name for the cloned template. If left blank, a default name will be auto-generated."
              title="Clone Name"
              variant="info"
              placement="top"
            >
              <Label className="cursor-help">
                Name (optional)
                <Info className="h-3 w-3 ml-1 text-muted-foreground"/>
              </Label>
            </DocTooltip>
            <AdvancedInput
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              placeholder="auto-generated"
            />
            <DocTooltip
              content={`Source: ${cloneTarget?.content.length ?? 0} chars, ${(cloneTarget?.variables ?? []).length} variables, category: ${cloneTarget?.category}`}
              title="Source Template Details"
              placement="top"
            >
              <div className="flex gap-2 text-xs text-muted-foreground cursor-help">
                <Badge variant="outline">{cloneTarget?.category}</Badge>
                <span>{cloneTarget?.content.length ?? 0} chars</span>
                <span>{(cloneTarget?.variables ?? []).length} vars</span>
              </div>
            </DocTooltip>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmClone} disabled={cloneLoading} className="gap-2">
              {cloneLoading && <Loader2 className="h-4 w-4 animate-spin"/>}
              <CopySlash className="h-4 w-4"/>
              Clone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Delete Result Dialog ── */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive"/>
              Bulk Delete Result
            </DialogTitle>
            <DialogDescription>
              Results of the bulk deletion operation.
            </DialogDescription>
          </DialogHeader>
          {bulkDeleteResult && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-3 gap-3">
                <div
                  className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-2xl font-bold text-emerald-600">{bulkDeleteResult.deleted}</div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400">Deleted</div>
                </div>
                <div
                  className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <div className="text-2xl font-bold text-amber-600">{bulkDeleteResult.skipped}</div>
                  <div className="text-xs text-amber-700 dark:text-amber-400">Skipped</div>
                </div>
                <div
                  className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <div className="text-2xl font-bold text-red-600">{bulkDeleteResult.errors.length}</div>
                  <div className="text-xs text-red-700 dark:text-red-400">Failed</div>
                </div>
              </div>
              {bulkDeleteResult.errors.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Errors:</Label>
                  <ScrollArea className="max-h-32">
                    {bulkDeleteResult.errors.map((err, i) => (
                      <div key={i} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0"/>
                        <span>ID {err.id}: {err.error}</span>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import Dialog ── */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderUp className="h-5 w-5 text-primary"/>
              Import Templates
            </DialogTitle>
            <DialogDescription>
              Paste JSON content of exported templates or upload a JSON file.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            <DocTooltip
              content={
                <div className="space-y-2">
                  <p className="text-xs font-semibold">JSON Format:</p>
                  <pre className="text-[10px] overflow-x-auto bg-slate-50 dark:bg-slate-800 p-2 rounded">
{`[
  {
    "name": "template_name",
    "displayName": "Template Name",
    "description": "...",
    "content": "...",
    "category": "general",
    "variables": [...],
    "settings": {...}
  }
]`}
                  </pre>
                </div>
              }
              title="Import Format Guide"
              variant="code"
              placement="top"
            >
              <Label className="cursor-help flex items-center gap-1">
                JSON Content
                <Info className="h-3 w-3 text-muted-foreground"/>
              </Label>
            </DocTooltip>
            <div className="relative">
              <CodeEditor
                value={importFileContent}
                onChange={(v) => setImportFileContent(v)}
                language="json"
                heightClass="h-[200px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Conflict Strategy</Label>
              <div className="flex gap-2">
                {(['skip', 'overwrite', 'rename'] as const).map((strategy) => (
                  <Button
                    key={strategy}
                    variant={importStrategy === strategy ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setImportStrategy(strategy)}
                    className="text-xs capitalize"
                  >
                    {strategy}
                  </Button>
                ))}
              </div>
              <DocTooltip
                content={
                  <div className="text-xs space-y-1">
                    <p><strong>Skip:</strong> Keep existing templates, ignore imported ones with same name.</p>
                    <p><strong>Overwrite:</strong> Replace existing templates (not built-in).</p>
                    <p><strong>Rename:</strong> Append suffix to avoid conflicts.</p>
                  </div>
                }
                title="Strategy Explanation"
                variant="help"
                placement="top"
              >
                <span className="text-xs text-muted-foreground cursor-help hover:text-primary">
                  Click for details
                  <Info className="h-3 w-3 ml-1 inline"/>
                </span>
              </DocTooltip>
            </div>
            {importResult && (
              <Alert className={cn(
                importResult.failed > 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-200',
              )}>
                {importResult.failed > 0 ? <AlertTriangle className="h-4 w-4 text-amber-600"/> :
                  <CheckCircle2 className="h-4 w-4 text-emerald-600"/>}
                <AlertTitle>{importResult.failed > 0 ? 'Partial Success' : 'Import Complete'}</AlertTitle>
                <AlertDescription className="text-xs">
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div><span className="text-emerald-600 font-bold">{importResult.imported}</span> imported</div>
                    <div><span className="text-amber-600 font-bold">{importResult.skipped}</span> skipped</div>
                    <div><span className="text-red-600 font-bold">{importResult.failed}</span> failed</div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmImport} disabled={importLoading || !importFileContent.trim()} className="gap-2">
              {importLoading && <Loader2 className="h-4 w-4 animate-spin"/>}
              <FolderUp className="h-4 w-4"/>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Rename Category Dialog ── */}
      <Dialog open={renameCatOpen} onOpenChange={setRenameCatOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary"/>
              Rename Category
            </DialogTitle>
            <DialogDescription>
              Rename category across all templates that use it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <Badge variant="outline" className="text-sm px-3 py-1 font-mono">{renameCatSource}</Badge>
              </div>
              <Edit className="h-4 w-4 text-muted-foreground rotate-90"/>
              <div className="flex flex-col items-center flex-1">
                <AdvancedInput
                  value={renameCatTarget}
                  onChange={(e) => setRenameCatTarget(e.target.value)}
                  placeholder="new_category"
                  className={cn(
                    renameCatTarget && /^[a-z_]+$/.test(renameCatTarget) ? 'border-green-500' :
                      renameCatTarget && !/^[a-z_]+$/.test(renameCatTarget) ? 'border-red-400' : '',
                  )}
                />
                <span
                  className="text-xs text-muted-foreground mt-1">Must be lowercase alphanumeric with underscores</span>
              </div>
            </div>
            <DocTooltip
              content="This operation will update the category field for all custom templates in this category. Built-in templates are not modified."
              title="Category Rename"
              variant="warning"
              placement="top"
            >
              <div
                className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 cursor-help">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5"/>
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  This will affect all custom templates in the "{renameCatSource}" category. Built-in templates are
                  excluded.
                </div>
              </div>
            </DocTooltip>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameCatOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmRenameCategory}
              disabled={renameCatLoading || !renameCatTarget || renameCatSource === renameCatTarget}
              className="gap-2"
            >
              {renameCatLoading && <Loader2 className="h-4 w-4 animate-spin"/>}
              <Edit className="h-4 w-4"/>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Selection Quick Actions Dialog ── */}
      <Dialog open={selectAllOpen} onOpenChange={setSelectAllOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary"/>
              Bulk Operations
            </DialogTitle>
            <DialogDescription>
              Choose an action for the {selectedIds.size} selected template(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <DocTooltip
              content="Permanently delete the selected custom templates. Built-in templates will be skipped."
              title="Bulk Delete"
              variant="error"
              placement="top"
            >
              <Button
                variant="outline"
                className="w-full justify-start gap-3 border-destructive/30 hover:bg-destructive/10 text-destructive"
                onClick={() => {
                  setSelectAllOpen(false);
                  setBulkDeleteOpen(true);
                }}
              >
                <Trash2 className="h-5 w-5"/>
                <div className="text-left">
                  <div className="font-medium">Delete Selected</div>
                  <div className="text-xs text-muted-foreground">Remove {selectedIds.size} templates</div>
                </div>
              </Button>
            </DocTooltip>
            <DocTooltip
              content="Export selected templates as a JSON file for backup or sharing."
              title="Export"
              placement="top"
            >
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => {
                  setSelectAllOpen(false);
                  handleExport();
                }}
              >
                <FolderDown className="h-5 w-5"/>
                <div className="text-left">
                  <div className="font-medium">Export Selected</div>
                  <div className="text-xs text-muted-foreground">Download as JSON</div>
                </div>
              </Button>
            </DocTooltip>
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => {
                setSelectAllOpen(false);
                const unselected = filteredAndSorted.filter((t) => !selectedIds.has(String(t.id)));
                if (unselected.length > 0) {
                  setEditTemplate(unselected[0]);
                  setIsEditing(true);
                  setCreateEditOpen(true);
                }
              }}
            >
              <FileText className="h-5 w-5"/>
              <div className="text-left">
                <div className="font-medium">View Unselected</div>
                <div className="text-xs text-muted-foreground">{filteredAndSorted.length - selectedIds.size} templates
                </div>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={deselectAll} className="gap-2">
              <X className="h-4 w-4"/>
              Deselect All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromptTemplates;
