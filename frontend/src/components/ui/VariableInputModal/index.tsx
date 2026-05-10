/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * VariableInputModal v2 - A highly customizable modal dialog for collecting
 * values for template variables.
 *
 * Advanced features:
 * - Multiple input types (text, number, email, url, password, select, textarea, checkbox)
 * - Sync and async custom validation with debounce
 * - Conditional variable visibility (dependsOn / condition)
 * - Variable grouping with collapsible sections
 * - Live template preview with variable highlighting
 * - Progress indicator for required fields
 * - Search/filter for large variable sets
 * - Copy variable reference to clipboard
 * - Reset to defaults
 * - Keyboard navigation (Enter → next field, Ctrl/Cmd+Enter → submit)
 * - LocalStorage persistence
 * - Auto-detect input type from variable name
 * - Password show/hide toggle
 * - Character count with min/max length
 * - Fill example values
 * - Touched-state tracking for better error UX
 * - Smooth staggered animations
 * - Full accessibility (ARIA, focus management, screen reader)
 * - Backward compatible with v1 API
 */

import * as React from 'react';
import {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Hash,
  Lightbulb,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';

import {type PromptTemplateVariable} from '@/lib/api';
import {cn} from '@/lib/utils';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '../Dialog';
import {Input} from '../Input';
import {Textarea} from '../Textarea';
import {Button} from '../Button';
import {Badge} from '../Badge';
import {ScrollArea} from '../ScrollArea';
import {
  COPY_FEEDBACK_MS,
  copyToClipboard,
  CSS_KEYFRAMES,
  deduplicateVariables,
  DEFAULT_ANIMATION_DURATION,
  DEFAULT_DEBOUNCE_MS,
  getInitialValues,
  type NormalizedVariable,
  normalizeVariables,
  reconcileValues,
  savePersistedValues,
  validateField,
  VARIABLE_REGEX,
} from '@/components/ui/VariableInputModal/utils.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Supported variable input types. */
export type VariableType =
  | 'text'
  | 'number'
  | 'email'
  | 'url'
  | 'password'
  | 'select'
  | 'textarea'
  | 'checkbox';

/** Option for select-type variables. */
export interface SelectOption {
  label: string;
  value: string;
}

/** Custom validation function – return an error message or null. */
export type VariableValidator = (
  value: string,
  allValues: Record<string, string>,
) => string | null | Promise<string | null>;

/** Conditional visibility function. */
export type VariableCondition = (
  allValues: Record<string, string>,
) => boolean;

/**
 * Extended variable configuration with full customization.
 * Backward compatible – all new fields are optional.
 */
export interface VariableConfig {
  /** Variable name / key. */
  name: string;
  /** Display label (defaults to name). */
  label?: string;
  /** Description shown below the label. */
  description?: string;
  /** Whether the field is required. */
  required?: boolean;
  /** Default value. */
  default?: string;
  /** Example value shown as a fillable hint. */
  example?: string;
  /** Input type (auto-detected if omitted). */
  type?: VariableType;
  /** Options for select type. */
  options?: SelectOption[];
  /** Placeholder text. */
  placeholder?: string;
  /** Maximum character length. */
  maxLength?: number;
  /** Minimum character length. */
  minLength?: number;
  /** Regex pattern for validation. */
  pattern?: RegExp;
  /** Custom validation function (sync or async). */
  validation?: VariableValidator;
  /** Show only when this variable has a truthy value. */
  dependsOn?: string;
  /** Conditional visibility function. */
  condition?: VariableCondition;
  /** Group name for collapsible grouping. */
  group?: string;
  /** Whether the field is hidden entirely. */
  hidden?: boolean;
  /** Whether the field is read-only. */
  readOnly?: boolean;
  /** Custom icon rendered beside the label. */
  icon?: React.ReactNode;
  /** Auto-focus this field on open. */
  autoFocus?: boolean;
  /** Number of rows for textarea (default 3). */
  rows?: number;
}

/**
 * MCP Server Template Variable – matches the format used in
 * MCPServerTemplate.variables. Uses 'key' instead of 'name'.
 */
export interface MCPServerTemplateVariable {
  key: string;
  description?: string;
  required?: boolean;
  default?: string;
  example?: string;
}

/** Union type for the variables prop. */
export type VariablesProp =
  | PromptTemplateVariable[]
  | MCPServerTemplateVariable[]
  | VariableConfig[]
  | string
  | null
  | undefined;

export interface VariableInputModalProps {
  /** Whether the modal is open. */
  isOpen: boolean;
  /** Template variables to collect values for. */
  variables: VariablesProp;
  /** Whether to skip the modal and use default/empty values. */
  skipModal?: boolean;
  /** Prefilled values (for editing). */
  prefillValues?: Record<string, string>;

  // ── Behaviour ────────────────────────────────────────────────────────────

  /** Validate on every change (debounced). Default false. */
  validateOnChange?: boolean;
  /** Validate when a field loses focus. Default false. */
  validateOnBlur?: boolean;
  /** Debounce delay in ms for onChange validation. Default 300. */
  debounceMs?: number;
  /** Auto-focus the first empty required field on open. Default true. */
  autoFocus?: boolean;
  /** Submit on Ctrl/Cmd + Enter. Default true. */
  submitOnShortcut?: boolean;
  /** Close the modal after successful submit. Default true. */
  closeOnSubmit?: boolean;
  /** LocalStorage key for persisting values across sessions. */
  persistKey?: string;

  // ── Text customisation ───────────────────────────────────────────────────

  /** Modal title. */
  title?: React.ReactNode;
  /** Modal subtitle / description. */
  subtitle?: React.ReactNode;
  /** Submit button text. */
  submitText?: string;
  /** Cancel button text. */
  cancelText?: string;
  /** Reset button text. */
  resetText?: string;
  /** Message shown when there are no variables. */
  emptyMessage?: React.ReactNode;

  // ── Feature toggles ─────────────────────────────────────────────────────

  /** Show live template preview. Requires templateString. */
  showPreview?: boolean;
  /** Show progress indicator for required fields. */
  showProgress?: boolean;
  /** Allow copying {{var}} reference from badges. */
  showCopyBadge?: boolean;
  /** Show reset-to-defaults button. */
  showReset?: boolean;
  /** Enable search/filter input. */
  searchable?: boolean;
  /** Template string for preview (uses {{varName}} syntax). */
  templateString?: string;
  /** Animate field entry with stagger. Default true. */
  animateFields?: boolean;
  /** Animation duration in ms. Default 300. */
  animationDuration?: number;

  // ── Styling ──────────────────────────────────────────────────────────────

  /** Custom icon for the title. */
  titleIcon?: React.ReactNode;
  /** Additional class for DialogContent. */
  className?: string;
  /** Additional class for header. */
  headerClassName?: string;
  /** Additional class for body area. */
  bodyClassName?: string;
  /** Additional class for footer. */
  footerClassName?: string;
  /** Additional class for each field wrapper. */
  fieldClassName?: string;
  /** Maximum width class for the dialog. Default "max-w-lg". */
  maxWidthClass?: string;
  /** Maximum height for scrollable area. Default "max-h-[400px]". */
  scrollMaxHeight?: string;

  // ── Validation ───────────────────────────────────────────────────────────

  /** Global custom validator – return a map of field → error message. */
  customValidator?: (
    values: Record<string, string>,
  ) => Record<string, string>;

  // ── Callbacks ────────────────────────────────────────────────────────────

  /** Close the modal. */
  onClose(): void;

  /** Callback when the user submits the form. */
  onSubmit(values: Record<string, string>): void;

  /** Called after validation with the current error map. */
  onValidate?: (errors: Record<string, string>) => void;
  /** Called when any value changes. */
  onValueChange?: (
    name: string,
    value: string,
    allValues: Record<string, string>,
  ) => void;
  /** Called after values are reset to defaults. */
  onReset?: (values: Record<string, string>) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Progress indicator for required fields. */
const FieldProgress = (props: {
  filled: number;
  total: number;
  className?: string;
}) => {
  const {filled, total, className} = props;
  const pct = total === 0 ? 100 : Math.round((filled / total) * 100);
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {filled}/{total} required field{total !== 1 ? 's' : ''}
        </span>
        <span className={cn(pct === 100 && 'text-green-600 dark:text-green-400')}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            pct === 100
              ? 'bg-green-500'
              : 'bg-primary',
          )}
          style={{width: `${pct}%`}}
        />
      </div>
    </div>
  );
};

/** Individual variable field renderer. */
const VariableField = (props: {
  variable: NormalizedVariable;
  value: string;
  error: string | null;
  touched: boolean;
  animated: boolean;
  animIndex: number;
  animDuration: number;
  onValueChange: (name: string, val: string) => void;
  onBlur: (name: string) => void;
  onFillExample: (name: string, example: string) => void;
  copiedName: string | null;
  onCopy: (name: string) => void;
  showCopyBadge: boolean;
  fieldId: string;
  descId: string;
  errorId: string;
  fieldClassName?: string;
}) => {
  const {
    variable,
    value,
    error,
    touched,
    animated,
    animIndex,
    animDuration,
    onValueChange,
    onBlur,
    onFillExample,
    copiedName,
    onCopy,
    showCopyBadge,
    fieldId,
    descId,
    errorId,
    fieldClassName,
  } = props;

  const [showPassword, setShowPassword] = useState(false);
  const [shaking, setShaking] = useState(false);
  const prevErrorRef = useRef<string | null>(null);

  // Trigger shake animation when error first appears
  useEffect(() => {
    if (error && !prevErrorRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 500);
      return () => clearTimeout(t);
    }
    prevErrorRef.current = error;
  }, [error]);

  const showError = error && (touched || !value);

  const inputClasses = cn(
    variable.type !== 'checkbox' &&
    (showError
      ? 'border-destructive focus-visible:ring-destructive'
      : 'focus-visible:ring-primary'),
    variable.readOnly && 'cursor-not-allowed opacity-70',
  );

  const renderInput = () => {
    switch (variable.type) {
      case 'textarea':
        return (
          <Textarea
            id={fieldId}
            value={value}
            onChange={(e) => onValueChange(variable.name, e.target.value)}
            onBlur={() => onBlur(variable.name)}
            placeholder={
              variable.placeholder || `Enter ${variable.label}...`
            }
            rows={variable.rows}
            maxLength={variable.maxLength ?? undefined}
            readOnly={variable.readOnly}
            className={inputClasses}
            aria-invalid={showError || undefined}
            aria-describedby={cn(
              variable.description && descId,
              showError && errorId,
            ) || undefined}
          />
        );

      case 'select':
        if (!variable.options?.length) {
          // Fallback to text input when no options provided
          return (
            <Input
              id={fieldId}
              type="text"
              value={value}
              onChange={(e) => onValueChange(variable.name, e.target.value)}
              onBlur={() => onBlur(variable.name)}
              placeholder={
                variable.placeholder || `Enter ${variable.label}...`
              }
              readOnly={variable.readOnly}
              className={inputClasses}
              aria-invalid={showError || undefined}
              aria-describedby={cn(
                variable.description && descId,
                showError && errorId,
              ) || undefined}
            />
          );
        }
        return (
          <select
            id={fieldId}
            value={value}
            onChange={(e) => onValueChange(variable.name, e.target.value)}
            onBlur={() => onBlur(variable.name)}
            disabled={variable.readOnly}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              'ring-offset-background focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-70',
              showError && 'border-destructive focus-visible:ring-destructive',
              inputClasses,
            )}
            aria-invalid={showError || undefined}
            aria-describedby={cn(
              variable.description && descId,
              showError && errorId,
            ) || undefined}
          >
            <option value="">
              {variable.placeholder || `Select ${variable.label}...`}
            </option>
            {variable.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <button
            type="button"
            role="switch"
            aria-checked={value === 'true'}
            id={fieldId}
            aria-describedby={cn(
              variable.description && descId,
              showError && errorId,
            ) || undefined}
            onClick={() =>
              onValueChange(variable.name, value === 'true' ? 'false' : 'true')
            }
            disabled={variable.readOnly}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full',
              'border-2 border-transparent transition-colors duration-200',
              'ease-in-out focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-70',
              value === 'true' ? 'bg-primary' : 'bg-muted',
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-5 w-5 rounded-full',
                'bg-background shadow-lg ring-0 transition-transform duration-200',
                value === 'true' ? 'translate-x-5' : 'translate-x-0',
              )}
            />
          </button>
        );

      case 'password':
        return (
          <div className="relative">
            <Input
              id={fieldId}
              type={showPassword ? 'text' : 'password'}
              value={value}
              onChange={(e) => onValueChange(variable.name, e.target.value)}
              onBlur={() => onBlur(variable.name)}
              placeholder={
                variable.placeholder || `Enter ${variable.label}...`
              }
              maxLength={variable.maxLength ?? undefined}
              readOnly={variable.readOnly}
              className={cn(inputClasses, 'pr-10')}
              aria-invalid={showError || undefined}
              aria-describedby={cn(
                variable.description && descId,
                showError && errorId,
              ) || undefined}
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4"/>
              ) : (
                <Eye className="h-4 w-4"/>
              )}
            </button>
          </div>
        );

      default: {
        // text, number, email, url
        const inputType =
          variable.type === 'number'
            ? 'number'
            : variable.type === 'email'
              ? 'email'
              : variable.type === 'url'
                ? 'url'
                : 'text';
        return (
          <Input
            id={fieldId}
            type={inputType}
            value={value}
            onChange={(e) => onValueChange(variable.name, e.target.value)}
            onBlur={() => onBlur(variable.name)}
            placeholder={
              variable.placeholder || `Enter ${variable.label}...`
            }
            maxLength={variable.maxLength ?? undefined}
            readOnly={variable.readOnly}
            className={inputClasses}
            aria-invalid={showError || undefined}
            aria-describedby={cn(
              variable.description && descId,
              showError && errorId,
            ) || undefined}
          />
        );
      }
    }
  };

  return (
    <div
      className={cn(
        'space-y-2',
        fieldClassName,
        animated && 'opacity-0',
        shaking && 'vim-shake',
      )}
      style={
        animated
          ? {
            animation: `vim-slide-in ${animDuration}ms ease-out forwards`,
            animationDelay: `${animIndex * 50}ms`,
          }
          : undefined
      }
    >
      {/* Label */}
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={fieldId}
          className="text-sm font-medium flex items-center gap-2"
        >
          {variable.icon}
          {variable.label}
          {variable.required && (
            <span className="text-destructive text-xs" aria-hidden="true">
              *
            </span>
          )}
        </label>

        {/* Fill example button */}
        {variable.example && variable.type !== 'checkbox' && (
          <button
            type="button"
            tabIndex={-1}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            onClick={() => onFillExample(variable.name, variable.example)}
            title={`Fill example: ${variable.example}`}
          >
            <Lightbulb className="h-3 w-3"/>
            Example
          </button>
        )}
      </div>

      {/* Description */}
      {variable.description && (
        <p id={descId} className="text-xs text-muted-foreground">
          {variable.description}
        </p>
      )}

      {/* Input */}
      {renderInput()}

      {/* Character count / min-max hint */}
      {(variable.maxLength || variable.minLength) &&
        variable.type !== 'checkbox' && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {variable.minLength
                ? `Min ${variable.minLength} char${variable.minLength > 1 ? 's' : ''}`
                : ''}
            </span>
            {variable.maxLength && (
              <span
                className={cn(
                  value.length > variable.maxLength && 'text-destructive',
                )}
              >
                {value.length}/{variable.maxLength}
              </span>
            )}
          </div>
        )}

      {/* Error */}
      {showError && (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-destructive flex items-center gap-1 vim-fade-in"
          style={{animation: `vim-fade-in 200ms ease-out`}}
        >
          <AlertCircle className="h-3 w-3 shrink-0"/>
          {error}
        </p>
      )}

      {/* Copy badge */}
      {showCopyBadge && (
        <Badge
          variant="outline"
          className={cn(
            'gap-1 cursor-pointer select-none transition-all duration-200',
            copiedName === variable.name &&
            'bg-primary/15 border-primary/40 vim-pulse-check',
          )}
          onClick={() => onCopy(variable.name)}
          title={
            copiedName === variable.name
              ? 'Copied!'
              : `Copy {{${variable.name}}}`
          }
        >
          {copiedName === variable.name ? (
            <Check className="h-3 w-3 text-green-600 dark:text-green-400"/>
          ) : (
            <Copy className="h-3 w-3"/>
          )}
          <code className="text-xs">{'{{' + variable.name + '}}'}</code>
          {variable.required && (
            <span className="text-destructive">*</span>
          )}
        </Badge>
      )}
    </div>
  );
};

/** Live template preview with variable highlighting. */
const VariablePreview = (props: {
  template: string;
  values: Record<string, string>;
  className?: string;
}) => {
  const {template, values, className} = props;

  const parts = useMemo(() => {
    const result: React.ReactNode[] = [];
    let lastIndex = 0;
    let keyIdx = 0;
    const regex = new RegExp(VARIABLE_REGEX.source, 'g');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(template)) !== null) {
      if (match.index > lastIndex) {
        result.push(
          <span key={keyIdx++}>{template.slice(lastIndex, match.index)}</span>,
        );
      }
      const varName = match[1];
      const val = values[varName];
      if (val?.trim()) {
        result.push(
          <mark
            key={keyIdx++}
            className="bg-primary/20 text-foreground rounded px-1 py-0.5 text-xs font-medium"
          >
            {val}
          </mark>,
        );
      } else {
        result.push(
          <mark
            key={keyIdx++}
            className="bg-destructive/15 text-destructive rounded px-1 py-0.5 text-xs"
          >
            {match[0]}
          </mark>,
        );
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < template.length) {
      result.push(<span key={keyIdx++}>{template.slice(lastIndex)}</span>);
    }
    return result;
  }, [template, values]);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5"/>
        Preview
      </div>
      <div className="rounded-md border bg-muted/40 p-3 text-sm leading-relaxed break-words whitespace-pre-wrap">
        {parts.length > 0 ? parts : template}
      </div>
    </div>
  );
};

const VariableInputModal: React.FC<VariableInputModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    variables: variablesProp,
    onSubmit,
    skipModal = false,
    prefillValues,
    // Behaviour
    validateOnChange = false,
    validateOnBlur = false,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    autoFocus = true,
    submitOnShortcut = true,
    closeOnSubmit = true,
    persistKey,
    // Text
    title = 'Fill in Template Variables',
    subtitle,
    submitText = 'Apply Template',
    cancelText = 'Cancel',
    resetText = 'Reset',
    emptyMessage = 'This template has no variables. It will be applied directly.',
    // Features
    showPreview = false,
    showProgress = true,
    showCopyBadge = true,
    showReset = true,
    searchable: searchableProp,
    templateString,
    animateFields = true,
    animationDuration = DEFAULT_ANIMATION_DURATION,
    // Styling
    titleIcon,
    className,
    headerClassName,
    bodyClassName,
    footerClassName,
    fieldClassName,
    maxWidthClass = 'max-w-lg',
    scrollMaxHeight = 'max-h-[400px]',
    // Validation
    customValidator,
    // Callbacks
    onValidate,
    onValueChange,
    onReset,
  } = props;

  const instanceId = useId();

  // ── Derived state ────────────────────────────────────────────────────────

  const normalizedVariables = useMemo(
    () => deduplicateVariables(normalizeVariables(variablesProp)),
    [variablesProp],
  );

  const memoizedPrefill = useMemo(() => prefillValues ?? {}, [prefillValues]);

  // Auto-enable search when there are 8+ variables
  const searchable = searchableProp ?? normalizedVariables.length >= 8;

  // ── Core state ───────────────────────────────────────────────────────────

  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────

  const autoSubmitDoneRef = useRef(false);
  const mountedRef = useRef(true);
  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const validationSeqRef = useRef(0);
  const firstErrorFieldRef = useRef<string | null>(null);
  const fieldFocusRef = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>>(
    new Map(),
  );

  // ── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      debounceTimersRef.current.forEach((t) => clearTimeout(t));
      debounceTimersRef?.current?.clear?.();
    };
  }, []);

  // ── Auto-submit guard reset ──────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      autoSubmitDoneRef.current = false;
      setAttemptedSubmit(false);
      setSearchQuery('');
      setCollapsedGroups({});
    }
  }, [isOpen]);

  // ── Initialise / reconcile values ────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    if (normalizedVariables.length === 0 || skipModal) {
      if (!autoSubmitDoneRef.current) {
        autoSubmitDoneRef.current = true;
        const initial = getInitialValues(
          normalizedVariables,
          memoizedPrefill,
          persistKey,
        );
        setValues(initial);
        setErrors({});
        onSubmit(initial);
        if (closeOnSubmit) onClose();
      }
      return;
    }
    // Normal path: initialise or reconcile
    setValues((prev) => {
      const hasPrev = Object.keys(prev).length > 0;
      if (!hasPrev) {
        return getInitialValues(normalizedVariables, memoizedPrefill, persistKey);
      }
      return reconcileValues(prev, normalizedVariables, memoizedPrefill);
    });
    setErrors({});
    setTouched({});
  }, [isOpen, normalizedVariables, skipModal, memoizedPrefill, persistKey, closeOnSubmit, onSubmit, onClose]);

  // ── Visible variables (with conditional logic + search) ──────────────────

  const visibleVariables = useMemo(() => {
    return normalizedVariables.filter((v) => {
      if (v.hidden) return false;
      if (v.dependsOn && !values[v.dependsOn]?.trim()) return false;
      return !(v.condition && !v.condition(values));

    });
  }, [normalizedVariables, values]);

  const filteredVariables = useMemo(() => {
    if (!searchQuery.trim()) return visibleVariables;
    const q = searchQuery.toLowerCase();
    return visibleVariables.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.label.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q),
    );
  }, [visibleVariables, searchQuery]);

  // ── Grouped variables ────────────────────────────────────────────────────

  const groupedVariables = useMemo(() => {
    const groups = new Map<string, NormalizedVariable[]>();
    for (const v of filteredVariables) {
      const g = v.group || '';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(v);
    }
    return Array.from(groups.entries()).map(([name, vars]) => ({
      name,
      variables: vars,
    }));
  }, [filteredVariables]);

  // ── Progress tracking ────────────────────────────────────────────────────

  const {requiredTotal, requiredFilled} = useMemo(() => {
    const req = visibleVariables.filter((v) => v.required);
    return {
      requiredTotal: req.length,
      requiredFilled: req.filter((v) => {
        if (v.type === 'checkbox') return values[v.name] === 'true';
        return values[v.name]?.trim().length > 0;
      }).length,
    };
  }, [visibleVariables, values]);

  // ── Validation helpers ───────────────────────────────────────────────────

  const runValidation = useCallback(
    async (
      varsToValidate: NormalizedVariable[],
      currentValues: Record<string, string>,
      touchedFields: Record<string, boolean>,
      onlyTouched: boolean,
    ): Promise<Record<string, string>> => {
      const seq = ++validationSeqRef.current;
      const newErrors: Record<string, string> = {};

      // Per-field validation
      const promises = varsToValidate.map(async (v) => {
        if (onlyTouched && !touchedFields[v.name]) return;
        const err = await validateField(v, currentValues[v.name] || '', currentValues);
        if (err) newErrors[v.name] = err;
      });

      await Promise.all(promises);

      if (seq !== validationSeqRef.current || !mountedRef.current) return {};

      // Global custom validator
      if (customValidator) {
        try {
          const globalErrors = customValidator(currentValues);
          Object.assign(newErrors, globalErrors);
        } catch {
          // Silently ignore
        }
      }

      return newErrors;
    },
    [customValidator],
  );

  const applyValidation = useCallback(
    (newErrors: Record<string, string>) => {
      if (!mountedRef.current) return;
      setErrors(newErrors);
      onValidate?.(newErrors);
    },
    [onValidate],
  );

  // ── Debounced per-field validation ───────────────────────────────────────

  const validateFieldDebounced = useCallback(
    (variableName: string) => {
      const existing = debounceTimersRef.current.get(variableName);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(async () => {
        const v = normalizedVariables.find((nv) => nv.name === variableName);
        if (!v) return;
        const err = await validateField(v, values[variableName] || '', values);
        if (!mountedRef.current) return;
        setErrors((prev) => {
          const next = {...prev};
          if (err) next[variableName] = err;
          else delete next[variableName];
          return next;
        });
      }, debounceMs);

      debounceTimersRef.current.set(variableName, timer);
    },
    [normalizedVariables, values, debounceMs],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleValueChange = useCallback(
    (name: string, val: string) => {
      setValues((prev) => {
        const next = {...prev, [name]: val};
        // Persist if needed
        if (persistKey) savePersistedValues(persistKey, next);
        return next;
      });

      // Clear error for this field
      setErrors((prev) => {
        if (prev[name]) {
          const next = {...prev};
          delete next[name];
          return next;
        }
        return prev;
      });

      // Debounced validation on change
      if (validateOnChange) {
        validateFieldDebounced(name);
      }

      onValueChange?.(name, val, values);
    },
    [persistKey, validateOnChange, validateFieldDebounced, onValueChange, values],
  );

  const handleBlur = useCallback(
    (name: string) => {
      setTouched((prev) => ({...prev, [name]: true}));

      if (validateOnBlur) {
        const v = normalizedVariables.find((nv) => nv.name === name);
        if (v) {
          validateField(v, values[name] || '', values).then((err) => {
            if (!mountedRef.current) return;
            setErrors((prev) => {
              const next = {...prev};
              if (err) next[name] = err;
              else delete next[name];
              return next;
            });
          });
        }
      }
    },
    [validateOnBlur, normalizedVariables, values],
  );

  const handleFillExample = useCallback(
    (name: string, example: string) => {
      handleValueChange(name, example);
    },
    [handleValueChange],
  );

  const handleCopy = useCallback(async (name: string) => {
    const ok = await copyToClipboard(`{{${name}}}`);
    if (ok) {
      setCopiedName(name);
      setTimeout(() => {
        if (mountedRef.current) setCopiedName(null);
      }, COPY_FEEDBACK_MS);
    }
  }, []);

  const handleReset = useCallback(() => {
    const resetValues: Record<string, string> = {};
    for (const v of normalizedVariables) {
      resetValues[v.name] = v.default || (v.type === 'checkbox' ? 'false' : '');
    }
    setValues(resetValues);
    setErrors({});
    setTouched({});
    setAttemptedSubmit(false);
    if (persistKey) savePersistedValues(persistKey, resetValues);
    onReset?.(resetValues);
  }, [normalizedVariables, persistKey, onReset]);

  const handleSubmit = useCallback(async () => {
    setAttemptedSubmit(true);
    setIsValidating(true);
    firstErrorFieldRef.current = null;

    const newErrors = await runValidation(
      visibleVariables,
      values,
      touched,
      false, // validate all, not just touched
    );

    setIsValidating(false);

    if (!mountedRef.current) return;

    if (Object.keys(newErrors).length > 0) {
      applyValidation(newErrors);
      // Mark errored fields as touched
      const newTouched: Record<string, boolean> = {};
      for (const key of Object.keys(newErrors)) {
        newTouched[key] = true;
        if (!firstErrorFieldRef.current) firstErrorFieldRef.current = key;
      }
      setTouched((prev) => ({...prev, ...newTouched}));

      // Focus first error field
      requestAnimationFrame(() => {
        const el = fieldFocusRef.current.get(firstErrorFieldRef.current!);
        el?.focus();
      });
      return;
    }

    applyValidation({});

    // Persist final values
    if (persistKey) savePersistedValues(persistKey, values);

    onSubmit(values);
    if (closeOnSubmit) onClose();
  }, [
    visibleVariables,
    values,
    touched,
    runValidation,
    applyValidation,
    persistKey,
    onSubmit,
    closeOnSubmit,
    onClose,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!submitOnShortcut) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [submitOnShortcut, handleSubmit],
  );

  const toggleGroup = useCallback((group: string) => {
    setCollapsedGroups((prev) => ({...prev, [group]: !prev[group]}));
  }, []);

  // ── Register field ref for focus management ──────────────────────────────

  const registerFieldRef = useCallback(
    (name: string) => (el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null) => {
      if (el) fieldFocusRef.current.set(name, el);
      else fieldFocusRef.current.delete(name);
    },
    [],
  );

  // ── Determine auto-focus field ───────────────────────────────────────────

  const autoFocusField = useMemo(() => {
    // Explicit autoFocus flag takes priority
    const explicit = visibleVariables.find((v) => v.autoFocus);
    if (explicit) return explicit.name;
    // Otherwise first empty required field
    if (autoFocus) {
      const first = visibleVariables.find(
        (v) => v.required && !values[v.name]?.trim(),
      );
      if (first) return first.name;
    }
    return null;
  }, [visibleVariables, autoFocus, values]);

  // ── Render ───────────────────────────────────────────────────────────────

  let fieldIndex = 0; // Global animation counter

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(maxWidthClass, className)}
        onKeyDown={handleKeyDown}
      >
        {/* Inject CSS keyframes */}
        <style dangerouslySetInnerHTML={{__html: CSS_KEYFRAMES}}/>

        <DialogHeader className={headerClassName}>
          <DialogTitle className="flex items-center gap-2">
            {titleIcon || <Hash className="h-5 w-5 text-primary"/>}
            {title}
          </DialogTitle>
          {subtitle && (
            <DialogDescription>{subtitle}</DialogDescription>
          )}
          {!subtitle && (
            <DialogDescription className="sr-only">
              Fill in the required template variables and apply.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Progress */}
        {showProgress && visibleVariables.length > 0 && (
          <FieldProgress filled={requiredFilled} total={requiredTotal}/>
        )}

        {/* Search */}
        {searchable && visibleVariables.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search variables..."
              className="pl-9 pr-9 h-9"
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5"/>
              </button>
            )}
            {searchQuery && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {filteredVariables.length} of {visibleVariables.length} variable
                {visibleVariables.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Scrollable body */}
        <ScrollArea className={scrollMaxHeight}>
          <div className={cn('space-y-5 p-1', bodyClassName)}>
            {normalizedVariables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {emptyMessage}
              </div>
            ) : filteredVariables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-40"/>
                <p>No variables match your search.</p>
              </div>
            ) : (
              groupedVariables.map((group) => {
                const isGrouped = group.name !== '';
                const isCollapsed = isGrouped && collapsedGroups[group.name];

                const groupContent = (
                  <div className={cn(isGrouped && 'space-y-4')}>
                    {group.variables.map((variable) => {
                      const idx = fieldIndex++;
                      const fid = `${instanceId}-${variable.name}`;
                      const descId = `${fid}-desc`;
                      const errorId = `${fid}-error`;

                      return (
                        <VariableField
                          key={variable.name}
                          variable={variable}
                          value={values[variable.name] || ''}
                          error={errors[variable.name] || null}
                          touched={!!touched[variable.name]}
                          animated={animateFields}
                          animIndex={idx}
                          animDuration={animationDuration}
                          onValueChange={handleValueChange}
                          onBlur={handleBlur}
                          onFillExample={handleFillExample}
                          copiedName={copiedName}
                          onCopy={handleCopy}
                          showCopyBadge={showCopyBadge}
                          fieldId={fid}
                          descId={descId}
                          errorId={errorId}
                          fieldClassName={fieldClassName}
                        />
                      );
                    })}
                  </div>
                );

                if (!isGrouped) return groupContent;

                return (
                  <div
                    key={group.name}
                    className="rounded-lg border bg-muted/20 overflow-hidden"
                  >
                    <button
                      type="button"
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors text-left"
                      onClick={() => toggleGroup(group.name)}
                      aria-expanded={!isCollapsed}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200"/>
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200"/>
                      )}
                      {group.name}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {group.variables.length} field
                        {group.variables.length !== 1 ? 's' : ''}
                      </span>
                    </button>
                    <div
                      className={cn(
                        'overflow-hidden transition-all duration-300 ease-in-out',
                        isCollapsed ? 'max-h-0' : 'max-h-[2000px]',
                      )}
                    >
                      <div className="px-4 pb-4 pt-1 space-y-4">
                        {group.variables.map((variable) => {
                          const idx = fieldIndex++;
                          const fid = `${instanceId}-${variable.name}`;
                          const descId = `${fid}-desc`;
                          const errorId = `${fid}-error`;

                          return (
                            <VariableField
                              key={variable.name}
                              variable={variable}
                              value={values[variable.name] || ''}
                              error={errors[variable.name] || null}
                              touched={!!touched[variable.name]}
                              animated={animateFields}
                              animIndex={idx}
                              animDuration={animationDuration}
                              onValueChange={handleValueChange}
                              onBlur={handleBlur}
                              onFillExample={handleFillExample}
                              copiedName={copiedName}
                              onCopy={handleCopy}
                              showCopyBadge={showCopyBadge}
                              fieldId={fid}
                              descId={descId}
                              errorId={errorId}
                              fieldClassName={fieldClassName}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Template preview */}
        {showPreview && templateString && visibleVariables.length > 0 && (
          <VariablePreview
            template={templateString}
            values={values}
            className="mt-4"
          />
        )}

        {/* Footer */}
        <DialogFooter
          className={cn('mt-4 pt-4 border-t gap-2', footerClassName)}
        >
          {showReset && normalizedVariables.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="mr-auto text-muted-foreground"
              disabled={isValidating}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5"/>
              {resetText}
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={isValidating}>
            {cancelText}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isValidating || (attemptedSubmit && Object.keys(errors).length > 0)}
          >
            {isValidating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2"/>
                Validating…
              </>
            ) : (
              submitText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VariableInputModal;
