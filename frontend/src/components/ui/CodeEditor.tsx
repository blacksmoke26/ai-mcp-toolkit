/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import React, {useState, useCallback, useEffect, forwardRef, useImperativeHandle, useRef, useMemo} from 'react';
import {githubDark, githubLight} from '@uiw/codemirror-theme-github';
import {xcodeDark, xcodeLight} from '@uiw/codemirror-theme-xcode';
import {javascript} from '@codemirror/lang-javascript';
import {json} from '@codemirror/lang-json';
import {EditorView} from '@codemirror/view';
import {EditorState} from '@codemirror/state';
import Editor, {type ReactCodeMirrorProps, type Extension} from '@uiw/react-codemirror';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {useTheme} from '@/context/ThemeContext.tsx';

// --- Icons (SVGs) ---
const Icons = {
  Copy: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"
         className="w-3.5 h-3.5">
      <path
        d="M1 9.50006C1 10.3285 1.67157 11.0001 2.5 11.0001H4L4 10.0001H2.5C2.22386 10.0001 2 9.7762 2 9.50006L2 2.50006C2 2.22392 2.22386 2.00006 2.5 2.00006L9.5 2.00006C9.77614 2.00006 10 2.22392 10 2.50006V4.00002H5.5C4.67158 4.00002 4 4.67159 4 5.50002V12.5C4 13.3284 4.67158 14 5.5 14H12.5C13.3284 14 14 13.3284 14 12.5V5.50002C14 4.67159 13.3284 4.00002 12.5 4.00002H11V2.50006C11 1.67163 10.3284 1.00006 9.5 1.00006H2.5C1.67157 1.00006 1 1.67163 1 2.50006V9.50006ZM5 5.50002C5 5.22388 5.22386 5.00002 5.5 5.00002H12.5C12.7761 5.00002 13 5.22388 13 5.50002V12.5C13 12.7762 12.7761 13 12.5 13H5.5C5.22386 13 5 12.7762 5 12.5V5.50002Z"
        fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
    </svg>
  ),
  Check: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"
         className="w-3.5 h-3.5 text-green-400">
      <path
        d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
        fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
    </svg>
  ),
  Format: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"
         className="w-3.5 h-3.5">
      <path
        d="M3.5 2C3.22386 2 3 2.22386 3 2.5V5.5C3 5.77614 3.22386 6 3.5 6C3.77614 6 4 5.77614 4 5.5V4H6V11H5C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13H7C7.55228 13 8 12.5523 8 12C8 11.4477 7.55228 11 7 11H7V4H9V5.5C9 5.77614 9.22386 6 9.5 6C9.77614 6 10 5.77614 10 5.5V2.5C10 2.22386 9.77614 2 9.5 2H3.5ZM11.8536 7.14645C11.7598 7.05268 11.6326 7 11.5 7C11.3674 7 11.2402 7.05268 11.1464 7.14645L9.14645 9.14645C8.95118 9.34171 8.95118 9.65829 9.14645 9.85355C9.34171 10.0488 9.65829 10.0488 9.85355 9.85355L11 8.70711V12.2929L9.85355 11.1464C9.65829 10.9512 9.34171 10.9512 9.14645 11.1464C8.95118 11.3417 8.95118 11.6583 9.14645 11.8536L11.1464 13.8536C11.2402 13.9473 11.3674 14 11.5 14C11.6326 14 11.7598 13.9473 11.8536 13.8536L13.8536 11.8536C14.0488 11.6583 14.0488 11.3417 13.8536 11.1464C13.6583 10.9512 13.3417 10.9512 13.1464 11.1464L12 12.2929V8.70711L13.1464 9.85355C13.3417 10.0488 13.6583 10.0488 13.8536 9.85355C14.0488 9.65829 14.0488 9.34171 13.8536 9.14645L11.8536 7.14645Z"
        fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
    </svg>
  ),
  Download: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"
         className="w-3.5 h-3.5">
      <path
        d="M7.50005 1.04999C7.74858 1.04999 7.95005 1.25146 7.95005 1.49999V8.41359L10.1819 6.18179C10.3576 6.00605 10.6425 6.00605 10.8182 6.18179C10.994 6.35753 10.994 6.64245 10.8182 6.81819L7.81825 9.81819C7.64251 9.99392 7.35759 9.99392 7.18185 9.81819L4.18185 6.81819C4.00611 6.64245 4.00611 6.35753 4.18185 6.18179C4.35759 6.00605 4.64251 6.00605 4.81825 6.18179L7.05005 8.41359V1.49999C7.05005 1.25146 7.25152 1.04999 7.50005 1.04999ZM2.50005 11C2.77619 11 3.00005 11.2239 3.00005 11.5V12.5C3.00005 12.7761 3.22391 13 3.50005 13H11.5001C11.7762 13 12.0001 12.7761 12.0001 12.5V11.5C12.0001 11.2239 12.2239 11 12.5001 11C12.7762 11 13.0001 11.2239 13.0001 11.5V12.5C13.0001 13.3284 12.3285 14 11.5001 14H3.50005C2.67162 14 2.00005 13.3284 2.00005 12.5V11.5C2.00005 11.2239 2.22391 11 2.50005 11Z"
        fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
    </svg>
  ),
  Maximize: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"
         className="w-3.5 h-3.5">
      <path
        d="M9.5 2C9.22386 2 9 2.22386 9 2.5C9 2.77614 9.22386 3 9.5 3H11.2929L8.14646 6.14646C7.95118 6.34171 7.95118 6.65829 8.14646 6.85355C8.34171 7.04882 8.65829 7.04882 8.85355 6.85355L12 3.70711V5.5C12 5.77614 12.2239 6 12.5 6C12.7761 6 13 5.77614 13 5.5V2.5C13 2.22386 12.7761 2 12.5 2H9.5ZM5.5 13C5.77614 13 6 12.7761 6 12.5C6 12.2239 5.77614 12 5.5 12H3.70711L6.85355 8.85355C7.04882 8.65829 7.04882 8.34171 6.85355 8.14645C6.65829 7.95118 6.34171 7.95118 6.14645 8.14645L3 11.2929V9.5C3 9.22386 2.77614 9 2.5 9C2.22386 9 2 9.22386 2 9.5V12.5C2 12.7761 2.22386 13 2.5 13H5.5Z"
        fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
    </svg>
  ),
  Minimize: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"
         className="w-3.5 h-3.5">
      <path
        d="M11.5 2C11.7761 2 12 2.22386 12 2.5V4.29289L8.85355 7.43934C8.65829 7.6346 8.65829 7.95118 8.85355 8.14645C9.04882 8.34171 9.3654 8.34171 9.56066 8.14645L12.7071 5H11.5C11.2239 5 11 4.77614 11 4.5C11 4.22386 11.2239 4 11.5 4H13.5C13.7761 4 14 4.22386 14 4.5V6.5C14 6.77614 13.7761 7 13.5 7C13.2239 7 13 6.77614 13 6.5V5.20711L9.85355 8.35355C9.3654 8.84171 8.58183 8.84171 8.09367 8.35355C7.60552 7.8654 7.60552 7.08183 8.09367 6.59367L11.2929 3.5H9.5C9.22386 3.5 9 3.27614 9 3C9 2.72386 9.22386 2.5 9.5 2.5H11.5V2ZM3.5 13C3.22386 13 3 12.7761 3 12.5V10.7071L6.14645 7.56066C6.34171 7.3654 6.34171 7.04882 6.14645 6.85355C5.95118 6.65829 5.6346 6.65829 5.43934 6.85355L2.29289 10H3.5C3.77614 10 4 10.2239 4 10.5C4 10.7761 3.77614 11 3.5 11H1.5C1.22386 11 1 10.7761 1 10.5V8.5C1 8.22386 1.22386 8 1.5 8C1.77614 8 2 8.22386 2 8.5V9.79289L5.14645 6.64645C5.6346 6.15829 6.41817 6.15829 6.90633 6.64645C7.39448 7.1346 7.39448 7.91817 6.90633 8.40633L3.70711 11.5H5.5C5.77614 11.5 6 11.7239 6 12C6 12.2761 5.77614 12.5 5.5 12.5H3.5V13Z"
        fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
    </svg>
  ),
  Settings: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"
         className="w-3.5 h-3.5">
      <path
        d="M7.07001 0.650002C6.75001 0.650002 6.49001 0.910002 6.49001 1.23V1.99C6.19001 2.11 5.90001 2.26 5.64001 2.44L5.02001 2.06C5.00001 2.05 4.98001 2.04 4.96001 2.03C4.69001 1.91 4.36001 2 4.18001 2.26L3.18001 3.72C3.00001 3.99 3.05001 4.36 3.30001 4.56L3.92001 5.04C3.85001 5.35 3.81001 5.67 3.81001 6C3.81001 6.33 3.85001 6.65 3.92001 6.96L3.30001 7.44C3.06001 7.63 3.00001 7.97 3.16001 8.23L4.16001 9.74C4.34001 10.02 4.70001 10.1 4.98001 9.95L5.64001 9.56C5.90001 9.74 6.19001 9.89 6.49001 10.01V10.77C6.49001 11.09 6.75001 11.35 7.07001 11.35H8.93001C9.25001 11.35 9.51001 11.09 9.51001 10.77V10.01C9.81001 9.89 10.1 9.74 10.36 9.56L11.02 9.95C11.3 10.11 11.66 10.02 11.84 9.74L12.84 8.23C13.01 7.95 12.95 7.59 12.7 7.4L12.08 6.92C12.15 6.61 12.19 6.29 12.19 5.96C12.19 5.63 12.15 5.31 12.08 5L12.7 4.52C12.94 4.33 13.01 3.97 12.82 3.71L11.82 2.25C11.64 1.98 11.28 1.89 11.01 2.04L10.35 2.43C10.09 2.25 9.80001 2.1 9.50001 1.98V1.23C9.50001 0.910002 9.24001 0.650002 8.92001 0.650002H7.07001ZM7.00001 1.65V2.64C7.00001 2.88 6.83001 3.09 6.59001 3.15C6.16001 3.26 5.77001 3.47 5.45001 3.74C5.26001 3.9 4.98001 3.92 4.77001 3.79L4.20001 3.46L3.83001 4L4.39001 4.44C4.58001 4.59 4.65001 4.85 4.56001 5.07C4.40001 5.47 4.31001 5.91 4.31001 6.37C4.31001 6.83 4.40001 7.27 4.56001 7.67C4.65001 7.89 4.58001 8.15 4.39001 8.3L3.83001 8.74L4.20001 9.28L4.77001 8.95C4.98001 8.82 5.26001 8.84 5.45001 9C5.77001 9.27 6.16001 9.48 6.59001 9.59C6.83001 9.65 7.00001 9.86 7.00001 10.1V11.1H8.00001V10.1C8.00001 9.86 8.17001 9.65 8.41001 9.59C8.84001 9.48 9.23001 9.27 9.55001 9C9.74001 8.84 10.02 8.82 10.23 8.95L10.8 9.28L11.17 8.74L10.61 8.3C10.42 8.15 10.35 7.89 10.44 7.67C10.6 7.27 10.69 6.83 10.69 6.37C10.69 5.91 10.6 5.47 10.44 5.07C10.35 4.85 10.42 4.59 10.61 4.44L11.17 4L10.8 3.46L10.23 3.79C10.02 3.92 9.74001 3.9 9.55001 3.74C9.23001 3.47 8.84001 3.26 8.41001 3.15C8.17001 3.09 8.00001 2.88 8.00001 2.64V1.65H7.00001ZM7.50001 5C6.67001 5 6.00001 5.67 6.00001 6.5C6.00001 7.33 6.67001 8 7.50001 8C8.33001 8 9.00001 7.33 9.00001 6.5C9.00001 5.67 8.33001 5 7.50001 5ZM5.00001 6.5C5.00001 5.12 6.12001 4 7.50001 4C8.88001 4 10 5.12 10 6.5C10 7.88 8.88001 9 7.50001 9C6.12001 9 5.00001 7.88 5.00001 6.5Z"
        fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
    </svg>
  ),
  ChevronRight: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3 h-3">
      <path d="M6.1584 3.13508C6.35985 2.94621 6.67617 2.95642 6.86504 3.15788L10.2246 6.71531C10.4076 6.91005 10.4076 7.21726 10.2246 7.412L6.86504 10.9694C6.67617 11.1709 6.35985 11.1811 6.1584 10.9922C5.95694 10.8034 5.94673 10.487 6.1356 10.2856L9.18432 7.06365L6.1356 3.84172C5.94673 3.64026 5.95694 3.32394 6.1584 3.13508Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
    </svg>
  )
};

/**
 * Represents a validation or syntax error within the editor.
 */
export interface EditorError {
  /**
   * The line number where the error occurred (1-based index).
   * @example
   * const error: EditorError = { line: 5, message: 'Unexpected token' };
   */
  line: number;

  /**
   * The column number where the error occurred (1-based index).
   * @example
   * const error: EditorError = { line: 5, column: 12, message: 'Unexpected token' };
   */
  column?: number;

  /**
   * The error message describing the issue.
   * @example
   * const error: EditorError = { line: 5, message: 'Unexpected token' };
   */
  message: string;
}

/**
 * Imperative handle interface for the CodeEditor component.
 * Allows parent components to interact directly with the editor instance.
 */
export interface EditorRef {
  /**
   * Retrieves the current content of the editor.
   * @returns The current string value of the editor.
   * @example
   * const editorRef = useRef<EditorRef>(null);
   * const currentCode = editorRef.current?.getValue();
   */
  getValue(): string;

  /**
   * Sets the content of the editor programmatically.
   * @param value - The string value to set in the editor.
   * @example
   * const editorRef = useRef<EditorRef>(null);
   * editorRef.current?.setValue('console.log("Hello World");');
   */
  setValue(value: string): void;

  /**
   * Focuses the editor input area.
   * @example
   * const editorRef = useRef<EditorRef>(null);
   * editorRef.current?.focus();
   */
  focus(): void;
}

/**
 * Props for the CodeEditor component.
 */
export interface CodeEditorProps {
  /**
   * The current value of the editor (controlled mode).
   * If provided, the component acts as a controlled input.
   * @example
   * <CodeEditor value={code} onChange={setCode} />
   */
  value?: string;

  /**
   * The initial value of the editor (uncontrolled mode).
   * Used only if `value` is not provided.
   * @example
   * <CodeEditor defaultValue="const x = 10;" />
   */
  defaultValue?: string;

  /**
   * The language mode for syntax highlighting.
   * @default 'javascript'
   * @example
   * <CodeEditor language="json" />
   */
  language?: 'json' | 'javascript';

  /**
   * The title displayed in the editor's header.
   * @default 'Editor'
   * @example
   * <CodeEditor title="Configuration" />
   */
  title?: string;

  /**
   * Prevents the user from editing the content.
   * @default false
   * @example
   * <CodeEditor readOnly={true} />
   */
  readOnly?: boolean;

  /**
   * An array of errors to display in the error panel.
   * @example
   * <CodeEditor errors={[{ line: 1, message: 'Invalid syntax' }]} />
   */
  errors?: EditorError[];

  /**
   * Additional props to pass directly to the underlying CodeMirror component.
   * @example
   * <CodeEditor editorProps={{ minHeight: '200px' }} />
   */
  editorProps?: ReactCodeMirrorProps;

  /**
   * Tailwind CSS class string to control the height of the editor container.
   * Ignored when `isFullscreen` is true.
   * @default 'h-72'
   * @example
   * <CodeEditor heightClass="h-96" />
   */
  heightClass?: string;

  /**
   * Controlled fullscreen state.
   * If true, the editor expands to fill the viewport.
   * @default false
   * @example
   * <CodeEditor isFullscreen={true} />
   */
  isFullscreen?: boolean;

  /**
   * Callback when fullscreen state changes.
   * @param isFullscreen - The new fullscreen state.
   * @example
   * const handleFullscreen = (isFull: boolean) => console.log(isFull);
   * <CodeEditor onFullscreenChange={handleFullscreen} />
   */
  onFullscreenChange?(isFullscreen: boolean): void;

  /**
   * Custom function to format the editor content.
   * If not provided, default JSON formatting is applied for JSON language.
   * @param value - The current value to format.
   * @returns The formatted string.
   * @example
   * const formatCode = (code) => prettier.format(code, { parser: "babel" });
   * <CodeEditor onFormat={formatCode} />
   */
  onFormat?(value: string): string;

  /**
   * Callback fired when the editor content changes.
   * @param value - The new value of the editor.
   * @example
   * const handleChange = (newCode) => setCode(newCode);
   * <CodeEditor onChange={handleChange} />
   */
  onChange?(value: string): void;
}

/**
 * Mapping of supported language modes to their corresponding CodeMirror extensions.
 * Used to apply syntax highlighting and language-specific features.
 */
const LANGUAGES: Record<string, Extension> = {
  json: json(),
  javascript: javascript(),
};

/**
 * CodeEditor Component
 *
 * A full-featured code editor wrapper built on top of CodeMirror.
 * Supports syntax highlighting for JSON and JavaScript, error reporting,
 * formatting, and various UI controls like fullscreen and settings.
 *
 * @example
 * ```tsx
 * <CodeEditor
 *   value={code}
 *   onChange={setCode}
 *   language="json"
 *   title="Config"
 *   errors={validationErrors}
 * />
 * ```
 */
const CodeEditor = forwardRef<EditorRef, CodeEditorProps>(
  (props, ref) => {
    const {theme} = useTheme();

    const {
      value: controlledValue,
      defaultValue = '',
      language = 'javascript',
      onChange,
      title = 'Editor',
      readOnly = false,
      errors = [],
      onFormat,
      editorProps,
      heightClass = 'h-72',
      isFullscreen: isFullscreenProp = false,
      onFullscreenChange,
    } = props;

    const editorInstance = useRef<EditorView | null>(null);
    const [internalValue, setInternalValue] = useState(defaultValue);
    const [copied, setCopied] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(isFullscreenProp);

    // --- Customization State ---
    const [lineNumbers, setLineNumbers] = useState(true);
    const [lineWrap, setLineWrap] = useState(false);
    const [fontSize, setFontSize] = useState(14); // Default font size
    const [tabSize, setTabSize] = useState(2); // Default tab size

    // Determine if component is controlled
    const value = controlledValue !== undefined ? controlledValue : internalValue;

    // Sync fullscreen prop
    useEffect(() => {
      setIsFullscreen(isFullscreenProp);
    }, [isFullscreenProp]);

    const toggleFullscreen = () => {
      const nextState = !isFullscreen;
      setIsFullscreen(nextState);
      onFullscreenChange?.(nextState);
    };

    useImperativeHandle(ref, () => ({
      getValue: () => value,
      setValue: (val) => {
        if (controlledValue === undefined) {
          setInternalValue(val);
        }
        onChange?.(val);
      },
      focus: () => editorInstance.current?.focus(),
    }));

    const handleChange = useCallback((val: string) => {
      if (controlledValue === undefined) {
        setInternalValue(val);
      }
      onChange?.(val);
    }, [controlledValue, onChange]);

    const handleCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }, [value]);

    const handleDownload = useCallback(() => {
      const blob = new Blob([value], {type: 'text/plain'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `code.${language === 'json' ? 'json' : 'js'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, [value, language]);

    const handleFormat = useCallback(() => {
      if (readOnly) return;
      let formattedValue = value;

      if (onFormat) {
        formattedValue = onFormat(value);
      } else if (language === 'json') {
        try {
          formattedValue = JSON.stringify(JSON.parse(value), null, tabSize);
        } catch (e) {
          console.warn('Invalid JSON');
          return;
        }
      } else {
        return;
      }

      if (formattedValue !== value) {
        handleChange(formattedValue);
      }
    }, [value, language, onFormat, readOnly, handleChange, tabSize]);

    // Note: We use a simple listener on selection changes to update status bar
    const [cursorPos, setCursorPos] = useState({line: 0, col: 0, selected: 0});

    const handleEditorSelection = useCallback((editor: EditorView) => {
      const sel = editor.state.selection.main;
      const line = editor.state.doc.lineAt(sel.from);
      setCursorPos({
        line: line.number,
        col: sel.from - line.from + 1,
        selected: sel.to - sel.from,
      });
      editorInstance.current = editor;
    }, []);

    // --- Dynamic Extensions with Customization ---
    const extensions = useMemo(() => [
      LANGUAGES[language],
      lineWrap ? EditorView.lineWrapping : [],
      EditorState.tabSize.of(tabSize),
      EditorView.theme({
        "&": { fontSize: `${fontSize}px` },
      }),
    ].filter(Boolean) as Extension[], [language, lineWrap, fontSize, tabSize]);

    const containerClasses = isFullscreen
      ? 'fixed inset-0 z-50 flex flex-col bg-[#272822]'
      : `flex flex-col rounded-lg overflow-hidden border border-neutral-700 bg-[#272822] shadow-lg w-full`;

    return (
      <div className={containerClasses}>
        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-3 py-2 bg-neutral-700 border-b border-neutral-700 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-neutral-100">{title}</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-600 text-neutral-300 uppercase font-bold tracking-wider">
              {language}
            </span>
            {readOnly && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900 text-amber-200 font-medium">
                READ ONLY
              </span>
            )}
          </div>

          <div className="flex items-center gap-0.5">
            <ActionButton title="Format Code" onClick={handleFormat} disabled={readOnly}>
              {Icons.Format}
            </ActionButton>
            <ActionButton title="Copy Code" onClick={handleCopy}>
              {copied ? Icons.Check : Icons.Copy}
            </ActionButton>
            <ActionButton title="Download File" onClick={handleDownload}>
              {Icons.Download}
            </ActionButton>

            <Separator/>

            <SettingsMenu
              lineNumbers={lineNumbers}
              setLineNumbers={setLineNumbers}
              lineWrap={lineWrap}
              setLineWrap={setLineWrap}
              fontSize={fontSize}
              setFontSize={setFontSize}
              tabSize={tabSize}
              setTabSize={setTabSize}
            />

            <ActionButton title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'} onClick={toggleFullscreen}>
              {isFullscreen ? Icons.Minimize : Icons.Maximize}
            </ActionButton>
          </div>
        </div>

        {/* Error Panel */}
        {errors.length > 0 && (
          <div
            className="bg-red-900/20 border-b border-red-900/50 px-4 py-2 text-xs text-red-200 font-mono overflow-auto max-h-20 shrink-0">
            {errors.map((err, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="font-bold text-red-400">[Ln {err.line}{err.column ? `, Col ${err.column}` : ''}]</span>
                <span>{err.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Editor Area */}
        <div className={`relative flex-grow ${isFullscreen ? '' : heightClass}`}>
          <Editor
            height="100%"
            theme={theme ==='dark' ? xcodeDark : xcodeLight}
            extensions={extensions}
            value={value}
            onChange={handleChange}
            editable={!readOnly}
            basicSetup={{
              lineNumbers: lineNumbers,
              foldGutter: true,
              dropCursor: true,
              allowMultipleSelections: true,
              highlightActiveLine: true,
              highlightActiveLineGutter: true,
            }}
            onCreateEditor={handleEditorSelection}
            {...editorProps}
            style={{height: '100%'}} // Font size is handled via extension
            width="100%"
          />
        </div>

        {/* Status Bar */}
        <div
          className="flex items-center justify-between px-3 py-1 bg-neutral-700 border-t border-neutral-700 text-[10px] text-neutral-300 shrink-0">
          <div className="flex gap-3">
            <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
            {cursorPos.selected > 0 && <span className="text-blue-300">Selected: {cursorPos.selected}</span>}
          </div>
          <div className="flex gap-3">
            <span>Spaces: {tabSize}</span>
            <span>UTF-8</span>
          </div>
        </div>
      </div>
    );
  },
);

CodeEditor.displayName = 'CodeEditor';

// --- Sub-Components ---

const ActionButton: React.FC<{
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({title, onClick, disabled, children}) => (
  <Tooltip.Provider delayDuration={300}>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className="p-1.5 rounded hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-neutral-500"
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="text-xs bg-neutral-900 text-white px-2 py-1 rounded shadow-md z-50"
          sideOffset={5}
        >
          {title}
          <Tooltip.Arrow className="fill-neutral-900"/>
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
);

const Separator = () => <div className="w-px h-4 bg-neutral-600 mx-1"/>;

// --- Enhanced Settings Menu ---

interface SettingsMenuProps {
  lineNumbers: boolean;
  setLineNumbers: (v: boolean) => void;
  lineWrap: boolean;
  setLineWrap: (v: boolean) => void;
  fontSize: number;
  setFontSize: (v: number) => void;
  tabSize: number;
  setTabSize: (v: number) => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = (props) => {
  const {
    lineNumbers, setLineNumbers,
    lineWrap, setLineWrap,
    fontSize, setFontSize,
    tabSize, setTabSize
  } = props;

  const fontSizes = [10, 11, 12, 13, 14, 16, 18, 20, 24];
  const tabSizes = [2, 4, 8];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="p-1.5 rounded hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors focus:outline-none">
          {Icons.Settings}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[180px] bg-neutral-800 rounded-md p-1 shadow-lg border border-neutral-700 text-neutral-300 text-xs z-50"
          sideOffset={5}
        >
          {/* View Section */}
          <DropdownMenu.Label className="px-2 py-1 text-[10px] text-neutral-500 uppercase tracking-wider">
            View
          </DropdownMenu.Label>

          <DropdownMenu.Item
            onSelect={() => setLineNumbers(!lineNumbers)}
            className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-neutral-700 hover:text-white outline-none cursor-pointer"
          >
            <span>Line Numbers</span>
            {lineNumbers && <span className="text-blue-400">✓</span>}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => setLineWrap(!lineWrap)}
            className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-neutral-700 hover:text-white outline-none cursor-pointer"
          >
            <span>Word Wrap</span>
            {lineWrap && <span className="text-blue-400">✓</span>}
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-neutral-700 my-1"/>

          {/* Editor Section */}
          <DropdownMenu.Label className="px-2 py-1 text-[10px] text-neutral-500 uppercase tracking-wider">
            Editor
          </DropdownMenu.Label>

          {/* Font Size Submenu */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-neutral-700 hover:text-white outline-none cursor-pointer w-full">
              <span>Font Size</span>
              <div className="flex items-center gap-1">
                <span className="text-neutral-400">{fontSize}px</span>
                {Icons.ChevronRight}
              </div>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                className="min-w-[100px] bg-neutral-800 rounded-md p-1 shadow-lg border border-neutral-700 text-neutral-300 text-xs z-50"
                sideOffset={2}
                alignOffset={-5}
              >
                {fontSizes.map((size) => (
                  <DropdownMenu.Item
                    key={size}
                    onSelect={() => setFontSize(size)}
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-neutral-700 hover:text-white outline-none cursor-pointer"
                  >
                    <span>{size}px</span>
                    {fontSize === size && <span className="text-blue-400">✓</span>}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          {/* Tab Size Submenu */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-neutral-700 hover:text-white outline-none cursor-pointer w-full">
              <span>Tab Size</span>
              <div className="flex items-center gap-1">
                <span className="text-neutral-400">{tabSize} spaces</span>
                {Icons.ChevronRight}
              </div>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                className="min-w-[120px] bg-neutral-800 rounded-md p-1 shadow-lg border border-neutral-700 text-neutral-300 text-xs z-50"
                sideOffset={2}
                alignOffset={-5}
              >
                {tabSizes.map((size) => (
                  <DropdownMenu.Item
                    key={size}
                    onSelect={() => setTabSize(size)}
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-neutral-700 hover:text-white outline-none cursor-pointer"
                  >
                    <span>{size} Spaces</span>
                    {tabSize === size && <span className="text-blue-400">✓</span>}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default CodeEditor;
