/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 * @description A fully-featured, strictly typed Markdown renderer with syntax highlighting, copy-to-clipboard, and anchor links.
 */

import * as React from 'react';
import ReactMarkdown, {type Options} from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type {Pluggable} from 'unified';
import type {Components} from 'react-markdown';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {vscDarkPlus} from 'react-syntax-highlighter/dist/esm/styles/prism';
import {Check, Copy, Link as LinkIcon} from 'lucide-react';
import type {JSX} from 'react';

// ==================================================================
// Types & Interfaces
// ==================================================================

/**
 * Configuration options for specific markdown rendering behaviors.
 */
interface MarkdownViewerOptions extends Pick<Options, 'allowedElements' | 'disallowedElements' | 'unwrapDisallowed'> {
  /** Whether to skip rendering HTML tags within the markdown. @default false */
  skipHtml?: boolean;
  /** Extra remark plugins to transform the markdown AST. */
  remarkPlugins?: Pluggable[];
  /** Extra rehype plugins to transform the HTML AST. */
  rehypePlugins?: Pluggable[];
}

/**
 * Props for the MarkdownViewer component.
 */
export interface MarkdownViewerProps {
  /** The markdown content to be rendered. */
  content: string;
  /** Optional CSS class name for the wrapper container. */
  className?: string;
  /** Configuration options for rendering behavior. */
  options?: MarkdownViewerOptions;
  /** Custom component overrides for specific markdown elements. */
  components?: Components;
  /** Custom theme object for syntax highlighting (optional). */
  codeTheme?: Record<string, React.CSSProperties>;
}

// ==================================================================
// Sub-Components
// ==================================================================

/**
 * Props for the CodeBlock component.
 */
interface CodeBlockProps {
  /** The code content to be rendered. */
  children: React.ReactNode;
  /** The CSS class name for the code element. */
  className?: string;
  /** The programming language for syntax highlighting. */
  language?: string;
}

/**
 * A specialized code block component with syntax highlighting and copy-to-clipboard functionality.
 * @param props - The component props.
 */
const CodeBlock: React.FC<CodeBlockProps> = ({children, className, language}) => {
  /** State to track if the code has been copied to the clipboard. */
  const [isCopied, setIsCopied] = React.useState(false);

  /** Extracted text content of the code block, stripped of trailing newlines. */
  const codeString = String(children).replace(/\n$/, '');

  /**
   * Handles the copy-to-clipboard action.
   * Sets the copied state to true and resets it after 2 seconds.
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // If no language is detected, fall back to basic styling (preserving original logic)
  if (!language) {
    return (
      <code className={className} style={{fontSize: '0.875rem', lineHeight: '1.25rem'}}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative group rounded-lg my-2 bg-[#1e1e1e] overflow-hidden border border-border/50">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3e3e42] opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-gray-400 font-mono capitalize">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
          aria-label="Copy code to clipboard"
        >
          {isCopied ? (
            <>
              <Check size={14} className="text-green-400"/>
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={14}/>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code Display */}
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: '0 0 0.5rem 0.5rem',
          background: 'transparent',
          padding: '1rem',
        }}
        codeTagProps={{
          className: 'font-mono text-sm',
        }}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );
};

/**
 * Props for the Heading component.
 */
interface HeadingProps {
  /** The heading level (1-6). */
  level: 1 | 2 | 3 | 4 | 5 | 6;
  /** The content of the heading. */
  children: React.ReactNode;
  /** Optional CSS class name. */
  className?: string;
}

/**
 * Heading component with auto-generated anchor links.
 */
const Heading: React.FC<HeadingProps> = ({level, children, className}) => {
  /** The unique ID for the heading, used for anchor links. */
  const [id, setId] = React.useState<string>('');

  React.useEffect(() => {
    // Generate a slug from the text content
    const text = typeof children === 'string' ? children : '';
    const slug = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
    setId(slug || `heading-${Math.random().toString(36).substr(2, 9)}`);
  }, [children]);

  /** The HTML tag to render (e.g., 'h1', 'h2'). */
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  /** Base CSS classes for each heading level. */
  const baseClasses = {
    h1: 'text-base font-semibold mt-4 mb-2',
    h2: 'text-sm font-semibold mt-3 mb-1.5',
    h3: 'text-sm font-medium mt-2 mb-1',
    h4: 'text-sm font-medium mt-2 mb-1',
    h5: 'text-sm font-medium mt-2 mb-1',
    h6: 'text-sm font-normal mt-2 mb-1 text-muted-foreground',
  };

  return (
    <Tag id={id} className={`${baseClasses[Tag]} ${className || ''} group flex items-center gap-2 scroll-mt-20`}>
      {children}
      <a
        href={`#${id}`}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-primary no-underline"
        aria-label="Link to this section"
      >
        <LinkIcon size={16}/>
      </a>
    </Tag>
  );
};

// ==================================================================
// Main Component
// ==================================================================

/**
 * A comprehensive Markdown viewer component.
 * Renders markdown content with syntax highlighting, copy-to-clipboard for code blocks,
 * anchor links for headers, and robust table styling.
 *
 * @param props - The component props.
 * @returns The rendered markdown content wrapped in a div.
 */
const MarkdownViewer: React.FC<MarkdownViewerProps> = (props) => {
  const {content, className, options, components: customComponents, codeTheme} = props;

  // Default options merged with user options
  const renderOptions: Options = {
    remarkPlugins: [remarkGfm, ...(options?.remarkPlugins || [])],
    rehypePlugins: options?.rehypePlugins || [],
    skipHtml: options?.skipHtml ?? false,
    allowedElements: options?.allowedElements,
    disallowedElements: options?.disallowedElements,
    unwrapDisallowed: options?.unwrapDisallowed,
  };

  // Merged component mappings: Custom components take precedence over defaults
  const defaultComponents: Components = {
    code: ({node, className, children, ...rest}) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      if (!language) {
        return (
          <code
            className="bg-muted/50 px-1.5 py-0.5 rounded text-xs font-mono text-foreground/90"
            {...rest}
          >
            {children}
          </code>
        );
      }

      return (
        <CodeBlock
          className={className}
          language={language}
        >
          {children}
        </CodeBlock>
      );
    },
    h1: ({children}) => <Heading level={1}>{children}</Heading>,
    h2: ({children}) => <Heading level={2}>{children}</Heading>,
    h3: ({children}) => <Heading level={3}>{children}</Heading>,
    h4: ({children}) => <Heading level={4}>{children}</Heading>,
    h5: ({children}) => <Heading level={5}>{children}</Heading>,
    h6: ({children}) => <Heading level={6}>{children}</Heading>,

    p: ({children}) => <p className="mb-2 last:mb-0 leading-relaxed text-sm">{children}</p>,

    ul: ({children}) => <ul
      className="list-disc list-inside mb-2 space-y-0.5 marker:text-muted-foreground">{children}</ul>,
    ol: ({children}) => <ol
      className="list-decimal list-inside mb-2 space-y-0.5 marker:text-muted-foreground">{children}</ol>,

    li: ({children}) => <li className="pl-1">{children}</li>,

    a: ({children, href}) => (
      <a
        href={href}
        className="text-primary hover:underline cursor-pointer text-sm"
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        {children}
      </a>
    ),

    blockquote: ({children}) => (
      <blockquote
        className="border-l-4 border-border pl-4 py-1 my-2 italic text-muted-foreground bg-muted/30 rounded-r">
        {children}
      </blockquote>
    ),

    table: ({children}) => (
      <div className="w-full my-2 overflow-x-auto">
        <table className="min-w-full divide-y divide-border border border-border rounded text-sm">{children}</table>
      </div>
    ),

    thead: ({children}) => <thead className="bg-muted/50">{children}</thead>,
    tbody: ({children}) => <tbody className="divide-y divide-border bg-background">{children}</tbody>,

    tr: ({children}) => <tr className="hover:bg-muted/50 transition-colors">{children}</tr>,

    th: ({children}) => (
      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {children}
      </th>
    ),

    td: ({children}) => (
      <td className="px-4 py-2 whitespace-nowrap text-foreground/90">{children}</td>
    ),

    hr: () => <hr className="my-4 border-t-border/50"/>,

    img: ({src, alt, ...rest}) => (
      <img
        src={src}
        alt={alt}
        className="rounded-lg max-w-full h-auto my-4 border border-border/50 shadow-sm"
        loading="lazy"
        {...rest}
      />
    ),

    strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
  };

  const finalComponents = {...defaultComponents, ...customComponents};

  return (
    <div className={className}>
      <ReactMarkdown
        {...renderOptions}
        components={finalComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownViewer;
