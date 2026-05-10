import type {
  SelectOption,
  VariableCondition,
  VariablesProp,
  VariableType,
  VariableValidator,
} from '@/components/ui/VariableInputModal/index.tsx';
import * as React from 'react';

export const CSS_KEYFRAMES = `
@keyframes vim-slide-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes vim-shake {
  0%, 100% { transform: translateX(0); }
  20%  { transform: translateX(-4px); }
  40%  { transform: translateX(4px); }
  60%  { transform: translateX(-3px); }
  80%  { transform: translateX(3px); }
}
@keyframes vim-pulse-check {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}
@keyframes vim-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
`;
export const DEFAULT_DEBOUNCE_MS = 300;
export const DEFAULT_ANIMATION_DURATION = 300;
export const COPY_FEEDBACK_MS = 2000;
export const VARIABLE_REGEX = /\{\{(\w+)}}/g;
/** Auto-detect input type from variable name heuristics. */
export const autoDetectType = (name: string): VariableType => {
  const lower = name.toLowerCase();
  if (lower.includes('email') || lower.includes('mail')) return 'email';
  if (
    lower.includes('url') ||
    lower.includes('link') ||
    lower.includes('website') ||
    lower.includes('endpoint') ||
    lower.includes('href')
  )
    return 'url';
  if (
    lower.includes('password') ||
    lower.includes('secret') ||
    lower.includes('token') ||
    lower.includes('api_key') ||
    lower.includes('apikey')
  )
    return 'password';
  if (
    lower.includes('count') ||
    lower.includes('number') ||
    lower.includes('port') ||
    lower.includes('timeout') ||
    lower.includes('limit') ||
    lower.includes('duration') ||
    lower.includes('age') ||
    lower.includes('qty') ||
    lower.includes('quantity')
  )
    return 'number';
  if (
    lower.includes('enabled') ||
    lower.includes('active') ||
    lower.includes('visible') ||
    lower.includes('debug') ||
    lower.includes('force') ||
    lower.includes('strict') ||
    lower.includes('verbose')
  )
    return 'checkbox';
  if (
    lower.includes('description') ||
    lower.includes('message') ||
    lower.includes('content') ||
    lower.includes('body') ||
    lower.includes('note') ||
    lower.includes('comment') ||
    lower.includes('bio') ||
    lower.includes('summary') ||
    lower.includes('detail')
  )
    return 'textarea';
  return 'text';
};

/** Internal normalized variable representation. */
export interface NormalizedVariable {
  name?: string;
  label?: string;
  description?: string;
  required?: boolean;
  default?: string;
  example?: string;
  type?: VariableType;
  options?: SelectOption[];
  placeholder?: string;
  maxLength?: number | null;
  minLength?: number | null;
  pattern?: RegExp | null;
  validation?: VariableValidator | null;
  dependsOn?: string | null;
  condition?: VariableCondition | null;
  group?: string | null;
  hidden?: boolean;
  readOnly?: boolean;
  icon?: React.ReactNode | null;
  autoFocus?: boolean;
  rows?: number;
}

/** Normalize a single raw variable into the internal format. */
export const normalizeOne = (v: any): NormalizedVariable => {
  const name = v.name || v.key || '';
  return {
    name,
    label: v.label || name,
    description: v.description || '',
    required: v.required || false,
    default: v.default ?? '',
    example: v.example || '',
    type: v.type || autoDetectType(name),
    options: v.options || [],
    placeholder: v.placeholder || '',
    maxLength: v.maxLength ?? null,
    minLength: v.minLength ?? null,
    pattern: v.pattern ?? null,
    validation: v.validation ?? null,
    dependsOn: v.dependsOn ?? null,
    condition: v.condition ?? null,
    group: v.group ?? null,
    hidden: v.hidden ?? false,
    readOnly: v.readOnly ?? false,
    icon: v.icon ?? null,
    autoFocus: v.autoFocus ?? false,
    rows: v.rows ?? 3,
  };
};
/** Normalize any supported variable format into NormalizedVariable[]. */
export const normalizeVariables = (vars: VariablesProp): NormalizedVariable[] => {
  if (typeof vars === 'string') {
    try {
      const parsed = JSON.parse(vars);
      return Array.isArray(parsed) ? parsed.map(normalizeOne) : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(vars)) return vars.map(normalizeOne);
  return [];
};
/** Remove duplicate variable names, keeping the first occurrence. */
export const deduplicateVariables = (vars: NormalizedVariable[]): NormalizedVariable[] => {
  const seen = new Set<string>();
  return vars.filter((v) => {
    if (!v.name) return false;
    if (seen.has(v.name)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[VariableInputModal] Duplicate variable "${v.name}" – only the first occurrence is kept.`,
        );
      }
      return false;
    }
    seen.add(v.name);
    return true;
  });
};
/** Copy text to clipboard. Returns success boolean. */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for older browsers / insecure contexts
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};
/** Load persisted values from localStorage. */
export const loadPersistedValues = (
  key: string,
  varNames: string[],
): Record<string, string> => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: Record<string, string> = {};
    for (const n of varNames) {
      if (typeof parsed[n] === 'string') out[n] = parsed[n];
    }
    return out;
  } catch {
    return {};
  }
};
/** Save values to localStorage. */
export const savePersistedValues = (key: string, values: Record<string, string>): void => {
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // Silently ignore quota / privacy errors
  }
};
/** Build initial values honouring priority: persisted > prefill > default > empty. */
export const getInitialValues = (
  variables: NormalizedVariable[],
  prefillValues: Record<string, string>,
  persistKey?: string,
): Record<string, string> => {
  const persisted = persistKey
    ? loadPersistedValues(persistKey, variables.map((v) => v.name))
    : {};
  const out: Record<string, string> = {};
  for (const v of variables) {
    if (persisted[v.name] !== undefined) {
      out[v.name] = persisted[v.name];
    } else if (prefillValues[v.name] !== undefined) {
      out[v.name] = prefillValues[v.name];
    } else if (v.default) {
      out[v.name] = v.default;
    } else {
      out[v.name] = v.type === 'checkbox' ? 'false' : '';
    }
  }
  return out;
};
/**
 * Reconcile current values with a potentially changed variable list.
 * Preserves user input for variables that still exist; initialises new ones.
 */
export const reconcileValues = (
  current: Record<string, string>,
  variables: NormalizedVariable[],
  prefill: Record<string, string>,
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const v of variables) {
    if (current[v.name] !== undefined) {
      out[v.name] = current[v.name];
    } else if (prefill[v.name] !== undefined) {
      out[v.name] = prefill[v.name];
    } else if (v.default) {
      out[v.name] = v.default;
    } else {
      out[v.name] = v.type === 'checkbox' ? 'false' : '';
    }
  }
  return out;
};
/** Validate a single variable, returning an error string or null. */
export const validateField = async (
  variable: NormalizedVariable,
  value: string,
  allValues: Record<string, string>,
): Promise<string | null> => {
  // Required check
  if (variable.required) {
    if (variable.type === 'checkbox') {
      if (value !== 'true') return 'This field must be enabled';
    } else if (!value.trim()) {
      return 'This field is required';
    }
  }

  // Skip further checks on empty optional fields
  if (!value.trim() && !variable.required) return null;

  // Min length
  if (variable.minLength && value.length < variable.minLength) {
    return `Must be at least ${variable.minLength} character${variable.minLength > 1 ? 's' : ''}`;
  }

  // Max length
  if (variable.maxLength && value.length > variable.maxLength) {
    return `Must be at most ${variable.maxLength} character${variable.maxLength > 1 ? 's' : ''}`;
  }

  // Pattern
  if (variable.pattern && !variable.pattern.test(value)) {
    return 'Invalid format';
  }

  // Type-specific built-in validation
  if (variable.type === 'email' && value.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email address';
  }
  if (variable.type === 'url' && value.trim()) {
    try {
      new URL(value);
    } catch {
      return 'Invalid URL';
    }
  }
  if (variable.type === 'number' && value.trim()) {
    if (isNaN(Number(value))) return 'Must be a valid number';
  }

  // Custom validation
  if (variable.validation) {
    try {
      return await variable.validation(value, allValues);
    } catch {
      return 'Validation failed';
    }
  }

  return null;
};
