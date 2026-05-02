/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * VariableInputModal - A modal dialog for collecting values for template variables.
 *
 * When a user selects a template with variables, this modal prompts them to fill in
 * the required values before applying the template to the message input.
 */

import * as React from 'react';
import {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {Hash, AlertCircle} from 'lucide-react';

import {type PromptTemplateVariable} from '@/lib/api';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from './Dialog';
import {Input} from './Input';
import {Textarea} from './Textarea';
import {Button} from './Button';
import {Badge} from './Badge';
import {ScrollArea} from './ScrollArea';

interface VariableInputModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Template variables to collect values for (can be arrayed, JSON string, null, or undefined) */
  variables: PromptTemplateVariable[] | string | null | undefined;
  /** Whether to skip the modal and use default/empty values */
  skipModal?: boolean;
  /** Prefilled values (for editing) */
  prefillValues?: Record<string, string>;

  /** Close the modal */
  onClose(): void;

  /** Callback when the user submits the form */
  onSubmit(values: Record<string, string>): void;
}

export const VariableInputModal: React.FC<VariableInputModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    variables,
    onSubmit,
    skipModal = false,
    prefillValues = {},
  } = props;
  /**
   * State for storing the current input values for each template variable.
   * Keys correspond to variable names, values are the user-provided strings.
   */
  const [values, setValues] = useState<Record<string, string>>({});

  /**
   * State for storing validation errors.
   * Keys correspond to variable names, values are the error message strings.
   */
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Normalizes the `variables` prop to ensure it is always a consistent array of `PromptTemplateVariable` objects.
   * Handles cases where the prop is a JSON string, an array, null, or undefined.
   * Memoized to prevent unnecessary re-calculations and potential infinite re-renders.
   *
   * @returns {PromptTemplateVariable[]} An array of normalized template variables.
   */
  const normalizedVariables = useMemo<PromptTemplateVariable[]>(() => {
    if (typeof variables === 'string') {
      try {
        return JSON.parse(variables) || [];
      } catch {
        return [];
      }
    }
    if (Array.isArray(variables)) {
      return variables;
    }
    return [];
  }, [variables]);

  /**
   * Memoized version of the `prefillValues` prop.
   * Ensures referential stability for dependencies in other hooks (like `useEffect`).
   * Defaults to an empty object if `prefillValues` is null or undefined.
   */
  const memoizedPrefillValues = useMemo(() => prefillValues ?? {}, [prefillValues]);

  /**
   * Ref to guard against repeated auto-submission.
   * Ensures that the auto-submit logic (e.g., when skipping the modal) executes only once per open cycle.
   */
  const autoSubmitDoneRef = useRef(false);

  /**
   * Resets the auto-submit guard whenever the modal opens.
   * This allows the auto-submit logic to trigger again if the modal is closed and reopened.
   */
  useEffect(() => {
    if (isOpen) {
      autoSubmitDoneRef.current = false;
    }
  }, [isOpen]);

  /**
   * Handles the submission of the variable values.
   * Invokes the `onSubmit` callback with the collected values and then closes the modal.
   *
   * @param {Record<string, string>} values - The object containing variable names and their corresponding input values.
   */
  const handleAutoSubmit = useCallback(
    (values: Record<string, string>) => {
      onSubmit(values);
      onClose();
    },
    [onSubmit, onClose],
  );

  useEffect(() => {
    if (isOpen && !autoSubmitDoneRef.current && (normalizedVariables.length === 0 || skipModal)) {
      autoSubmitDoneRef.current = true;
      // Initialize values from prefill or empty strings
      const initial: Record<string, string> = {};
      normalizedVariables.forEach((v) => {
        initial[v.name] = memoizedPrefillValues[v.name] || '';
      });
      setValues(initial);
      setErrors({});
      handleAutoSubmit(initial);
    }
  }, [isOpen, normalizedVariables, skipModal, memoizedPrefillValues, handleAutoSubmit]);

  // Sync values/prefill when variables change (but not on auto-submit path)
  useEffect(() => {
    if (isOpen && normalizedVariables.length > 0 && !skipModal) {
      const initial: Record<string, string> = {};
      normalizedVariables.forEach((v) => {
        initial[v.name] = memoizedPrefillValues[v.name] || '';
      });
      setValues(initial);
      setErrors({});
    }
  }, [isOpen, normalizedVariables, skipModal, memoizedPrefillValues]);

  const handleValueChange = useCallback(
    (variableName: string, value: string) => {
      setValues((prev) => ({...prev, [variableName]: value}));
      // Clear error when user starts typing
      setErrors((prev) => {
        if (prev[variableName]) {
          const next = {...prev};
          delete next[variableName];
          return next;
        }
        return prev;
      });
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    const newErrors: Record<string, string> = {};
    normalizedVariables.forEach((v) => {
      if (v.required && !values[v.name]?.trim()) {
        newErrors[v.name] = 'This field is required';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    handleAutoSubmit(values);
  }, [normalizedVariables, values, handleAutoSubmit]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary"/>
            Fill in Template Variables
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-80">
          <div className="space-y-4 p-1">
            {normalizedVariables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                This template has no variables. It will be applied directly.
              </div>
            ) : (
              normalizedVariables.map((variable) => (
                <div key={variable.name} className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    {variable.name}
                    {variable.required && (
                      <span className="text-destructive text-xs">*</span>
                    )}
                  </label>
                  <p className="text-xs text-muted-foreground">{variable.description}</p>
                  {variable.name.length > 20 ? (
                    <Textarea
                      value={values[variable.name] || ''}
                      onChange={(e) => handleValueChange(variable.name, e.target.value)}
                      placeholder={`Enter value for ${variable.name}...`}
                      rows={3}
                      className={errors[variable.name] ? 'border-destructive' : ''}
                    />
                  ) : (
                    <Input
                      value={values[variable.name] || ''}
                      onChange={(e) => handleValueChange(variable.name, e.target.value)}
                      placeholder={`Enter value for ${variable.name}...`}
                      className={errors[variable.name] ? 'border-destructive' : ''}
                    />
                  )}
                  {errors[variable.name] && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3"/>
                      {errors[variable.name]}
                    </p>
                  )}
                </div>
              ))
            )}

            {/* Variable badges */}
            {normalizedVariables.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {normalizedVariables.map((v) => (
                  <Badge key={v.name} variant="outline" className="gap-1">
                    <code className="text-xs">{'{{' + v.name + '}}'}</code>
                    {v.required && <span className="text-destructive">*</span>}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={Object.keys(errors).length > 0}>
            Apply Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VariableInputModal;
