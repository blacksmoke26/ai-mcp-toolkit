/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * Statistics summary for the prompt templates' dashboard.
 * Aggregates counts and metadata about the current template collection.
 */
export interface Stats {
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
export interface VariableField {
  /** The unique identifier for the variable (e.g., 'user_name'). */
  name: string;
  /** Human-readable description of what the variable represents. */
  description: string;
  /** Whether the variable must be provided during rendering. */
  required: boolean;
  /** The current value assigned to the variable. */
  value: string;
}

/**
 * Represents the statistical summary of prompt templates returned by the backend.
 * Provides counts for total, built-in, and custom templates, as well as a breakdown by category.
 */
export interface TemplateStats {
  /** The total number of templates available in the system. */
  total: number;
  /** The number of templates that are marked as built-in (system defaults). */
  builtIn: number;
  /** The number of templates that have been created by the user. */
  custom: number;
  /** An object mapping category names to the count of templates belonging to each category. */
  categories: Record<string, number>;
}

/**
 * Represents the result of a bulk delete operation.
 * Details how many templates were deleted, skipped, or encountered errors.
 */
export interface BulkDeleteResult {
  /** The number of templates that were successfully deleted. */
  deleted: number;
  /** The number of templates that were skipped (e.g., built-in templates or already deleted). */
  skipped: number;
  /** An array of objects containing the ID and error message for each template that failed to delete. */
  errors: Array<{ id: number; error: string }>;
}

/**
 * Represents the result of a bulk import operation.
 * Summarizes the outcome of processing an import file.
 */
export interface ImportResult {
  /** The number of templates that were successfully imported. */
  imported: number;
  /** The number of templates that were skipped (e.g., due to conflict resolution settings). */
  skipped: number;
  /** The number of templates that failed to import due to errors. */
  failed: number;
}

/**
 * Represents the result of validating a prompt template's content.
 * Indicates whether the template is valid and lists any syntax or logic errors found.
 */
export interface ValidationResult {
  /** A boolean flag indicating whether the template content passed validation. */
  valid: boolean;
  /** An array of error messages describing validation failures. Empty if `valid` is true. */
  errors: string[];
}

/** Display mode for the template list. */
export type ViewMode = 'grid' | 'list';
/** Fields available for sorting the template list. */
export type SortField = 'name' | 'displayName' | 'updatedAt' | 'category';
/** Direction for sorting the template list. */
export type SortDir = 'asc' | 'desc';
