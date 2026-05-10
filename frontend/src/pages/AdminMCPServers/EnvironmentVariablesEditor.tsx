/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * EnvironmentVariablesEditor Component
 *
 * A visual key-value table editor for environment variables, replacing raw JSON editing.
 */

import React, {useCallback, useMemo, useState} from 'react';

import {Button} from '@/components/ui/Button';
import {Label} from '@/components/ui/Label';
import {Badge} from '@/components/ui/Badge';
import CodeEditor from '@/components/ui/CodeEditor';
import {AdvancedInput} from '@/components/ui/AdvanceInput';
import {Alert, AlertDescription} from '@/components/ui/Alert';
import {ScrollArea, ScrollBar} from '@/components/ui/ScrollArea';

import {AlertCircle, ArrowDown, ArrowUp, Check, Copy, Download, Plus, Trash2, Upload, X} from 'lucide-react';
import {
  convertRowsToJson,
  type EnvVarRow,
  generateId,
  isValidJson,
  parseJsonToRows,
} from './utils';
/**
 * Props for the EnvironmentVariablesEditor component.
 *
 * @remarks
 * This component provides a visual table-based interface for editing
 * environment variables as key-value pairs. The internal state is always
 * stored and reported as a JSON object string to maintain compatibility
 * with existing systems that expect JSON-formatted environment variable data.
 *
 * @example
 * // Basic usage with default props
 * <EnvironmentVariablesEditor
 *   value='{"NODE_ENV":"production","PORT":"3000"}'
 *   onChange={(val) => setEnvVars(val)}
 * />
 *
 * @example
 * // With custom label and help text
 * <EnvironmentVariablesEditor
 *   value='{"DB_HOST":"localhost"}'
 *   onChange={handleChange}
 *   label="Database Configuration"
 *   helpText="Enter your database connection variables here."
 *   placeholder="key=value"
 * />
 */
export interface EnvironmentVariablesEditorProps {
  /** Current environment variables as a JSON string */
  value: string;
  /** Callback when value changes */
  onChange: (newValue: string) => void;
  /** Placeholder text for empty rows */
  placeholder?: string;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Custom label for the editor section */
  label?: string;
  /** Help text displayed below the label */
  helpText?: string;
}

/**
 * EnvironmentVariablesEditor component provides a visual table interface
 * for editing environment variables as key-value pairs.
 *
 * @param props - The component props.
 *
 * @example
 * ```tsx
 * <EnvironmentVariablesEditor
 *   value='{"API_KEY":"abc123"}'
 *   onChange={setConfig}
 *   label="Environment Variables"
 *   helpText="Define runtime configuration variables."
 * />
 * ```
 *
 * @remarks
 * The component maintains an internal array of rows for the table interface.
 * On every change (add, delete, edit, reorder, import, export), the internal
 * state is synchronized back to the parent via the `onChange` callback as a
 * JSON string. A live JSON preview is shown below the table for quick reference.
 */
const EnvironmentVariablesEditor: React.FC<EnvironmentVariablesEditorProps> = (props) => {
  const {
    value,
    onChange,
    placeholder = 'key=value',
    disabled = false,
    label,
    helpText,
  } = props;

  /** The current set of rows rendered in the table. */
  const [rows, setRows] = useState<EnvVarRow[]>(() => parseJsonToRows(value));

  /** Tracks whether the last copy action succeeded, for visual feedback. */
  const [copied, setCopied] = useState<boolean>(false);

  /** Holds JSON string from the import dialog, if open. */
  const [importText, setImportText] = useState<string>('');

  /** Whether the import dialog is currently visible. */
  const [showImport, setShowImport] = useState<boolean>(false);

  /** Error message displayed during import, if the pasted JSON is invalid. */
  const [importError, setImportError] = useState<string>('');

  /**
   * Synchronizes the internal JSON preview with the latest `value` prop
   * when the parent updates it externally (e.g., after an import).
   */
  React.useEffect(() => {
    const currentRows = parseJsonToRows(value);
    setRows(currentRows);
  }, [value]);

  /**
   * Validates the current JSON state.
   */
  const jsonValid = useMemo(() => isValidJson(value), [value]);

  // ── Row Operations ────────────────────────────────────────────────

  /**
   * Adds a new empty row to the table.
   *
   * @remarks
   * A new unique row is appended to the end of the existing rows.
   */
  const addRow = useCallback(() => {
    setRows((prev) => [...prev, {id: generateId(), key: '', value: ''}]);
  }, []);

  /**
   * Removes a row by its unique identifier.
   *
   * @param id - The `id` of the row to remove.
   */
  const deleteRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  /**
   * Updates the `key` or `value` of an existing row.
   *
   * @param id - The unique identifier of the row to update.
   * @param field - Either `'key'` or `'value'` indicating which field to modify.
   * @param newValue - The new string value for the specified field.
   */
  const updateRow = useCallback((id: string, field: 'key' | 'value', newValue: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? {...row, [field]: newValue} : row)),
    );
  }, []);

  /**
   * Moves a row up in the list by swapping it with the previous row.
   *
   * @param index - The current zero-based index of the row to move.
   */
  const moveRowUp = useCallback((index: number) => {
    if (index <= 0) return;
    setRows((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  /**
   * Moves a row down in the list by swapping it with the next row.
   *
   * @param index - The current zero-based index of the row to move.
   */
  const moveRowDown = useCallback((index: number) => {
    setRows((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  // ── JSON Preview Sync ─────────────────────────────────────────────

  /**
   * Periodically syncs the table rows back to JSON and calls `onChange`
   * so the parent stays updated.
   */
  const syncToJson = useCallback(() => {
    const jsonStr = convertRowsToJson(rows);
    if (jsonStr !== value) {
      onChange(jsonStr);
    }
  }, [rows, value, onChange]);

  // Sync whenever rows change (debounced by React batching)
  React.useEffect(() => {
    syncToJson();
  }, [rows, syncToJson]);

  // ── Import / Export ───────────────────────────────────────────────

  /**
   * Handles import: parses the text from the import dialog and replaces
   * all current rows with the parsed key-value pairs.
   */
  const handleImport = useCallback(() => {
    setImportError('');
    if (!importText.trim()) {
      setShowImport(false);
      return;
    }

    try {
      const obj = JSON.parse(importText);
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        setImportError('Imported JSON must be an object (key-value pairs).');
        return;
      }

      const newRows: EnvVarRow[] = Object.entries(obj).map(([k, v]) => ({
        id: generateId(),
        key: k,
        value: String(v),
      }));

      if (newRows.length === 0) {
        newRows.push({id: generateId(), key: '', value: ''});
      }

      setRows(newRows);
      setImportText('');
      setShowImport(false);
    } catch {
      setImportError('Invalid JSON. Please check the format and try again.');
    }
  }, [importText]);

  /**
   * Copies the current JSON state to the clipboard with visual feedback.
   */
  const handleCopyToJson = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [value]);

  /**
   * Downloads the current JSON state as a `.json` file.
   */
  const handleExportToJson = useCallback(() => {
    const blob = new Blob([value], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'environment-variables.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [value]);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      {(label || helpText) && (
        <div className="space-y-1">
          {label && <Label className="text-base font-semibold">{label}</Label>}
          {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
        </div>
      )}

      {/* Key-Value Table */}
      <ScrollArea className="w-full rounded-md border border-border max-h-96">
        <div className="p-4">
          {/* Table Header */}
          <div className="flex items-center gap-4 mb-3 pb-2 border-b border-border">
            <Label className="w-1/4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Key
            </Label>
            <Label className="w-2/4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Value
            </Label>
            <div className="w-20"/>
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={row.id} className="flex items-center gap-4 group">
                {/* Key Input */}
                <AdvancedInput
                  className="font-mono text-sm"
                  onClearClick={() => updateRow(row.id, 'key', '')}
                  placeholder="KEY"
                  value={row.key}
                  disabled={disabled}
                  onChange={(e) => updateRow(row.id, 'key', e.target.value)}
                />

                {/* Value Input */}
                <AdvancedInput
                  className="font-mono text-sm"
                  onClearClick={() => updateRow(row.id, 'value', '')}
                  placeholder={placeholder}
                  value={row.value}
                  disabled={disabled}
                  onChange={(e) => updateRow(row.id, 'value', e.target.value)}
                />

                {/* Row Actions */}
                <div
                  className="w-20 flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  {!disabled && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === 0}
                        onClick={() => moveRowUp(index)}
                        title="Move up"
                      >
                        <ArrowUp className="h-3.5 w-3.5"/>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === rows.length - 1}
                        onClick={() => moveRowDown(index)}
                        title="Move down"
                      >
                        <ArrowDown className="h-3.5 w-3.5"/>
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    disabled={disabled}
                    onClick={() => deleteRow(row.id)}
                    title="Delete row"
                  >
                    <Trash2 className="h-3.5 w-3.5"/>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <ScrollBar orientation="horizontal"/>
        <ScrollBar orientation="vertical"/>
      </ScrollArea>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
          >
            <Plus className="h-4 w-4 mr-1"/>
            Add Variable
          </Button>
        )}

        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowImport(true)}
          >
            <Upload className="h-4 w-4 mr-1"/>
            Import JSON
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopyToJson}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1"/>
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1"/>
              Copy JSON
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExportToJson}
        >
          <Download className="h-4 w-4 mr-1"/>
          Export JSON
        </Button>
      </div>

      {/* Validation Indicator */}
      <div className="flex items-center gap-2">
        {jsonValid ? (
          <Badge variant="success" className="text-xs">
            Valid JSON
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-xs">
            Invalid JSON
          </Badge>
        )}
        {!jsonValid && (
          <Badge variant="warning" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1"/>
            Source value has a parsing error
          </Badge>
        )}
      </div>

      {/* Live JSON Preview */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Live JSON Preview</Label>
        <CodeEditor
          value={value}
          language="json"
          readOnly
          heightClass="h-48"
          title="Environment Variables (JSON)"
        />
      </div>

      {/* Import Dialog */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg border border-border shadow-xl w-full max-w-2xl m-4">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Import Environment Variables</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowImport(false)}
                >
                  <X className="h-4 w-4"/>
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Paste your JSON below</Label>
                <CodeEditor
                  value={importText}
                  language="json"
                  onChange={setImportText}
                  heightClass="h-40"
                  title="Paste JSON"
                />
              </div>

              {importError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4"/>
                  <AlertDescription>{importError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowImport(false);
                    setImportText('');
                    setImportError('');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleImport}>Import</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnvironmentVariablesEditor;
