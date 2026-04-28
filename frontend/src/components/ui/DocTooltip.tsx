/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module DocTooltip
 * @description Advanced documentation tooltip component for the MCP Toolkit.
 *
 * Features:
 * - Hover-based tooltip with rich content support
 * - Markdown-rendered descriptions
 * - Code snippets with syntax highlighting
 * - Keyboard accessible (Esc to close, Tab to navigate)
 * - Position-aware rendering (avoids viewport edges)
 * - Multi-line tooltip content with scroll support
 * - Configurable delay, placement, and animation
 *
 * ## Usage
 *
 * ```tsx
 * import { DocTooltip } from '@/components/DocTooltip';
 *
 * function MyComponent() {
 *   return (
 *     <DocTooltip
 *       content="Description of this feature"
 *       title="Feature Name"
 *       codeExample="const x = 42;"
 *     >
 *       <InfoIcon className="h-4 w-4" />
 *     </DocTooltip>
 *   );
 * }
 * ```
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Info, ExternalLink, BookOpen, Lightbulb, AlertCircle, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { xcodeLight as lightCodeTheme } from '@uiw/codemirror-theme-xcode';

// ─── Types ────────────────────────

export type TooltipPlacement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'left-start'
  | 'left-end'
  | 'right-start'
  | 'right-end';

export type TooltipVariant =
  | 'default'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'help'
  | 'code';

export interface DocTooltipProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'content'> {
  /**
   * The trigger element that shows the tooltip on hover.
   */
  trigger?: React.ReactNode;

  /**
   * The main content of the tooltip. Can be a string or React element.
   */
  content: string | React.ReactNode;

  /**
   * Optional title for the tooltip.
   */
  title?: React.ReactNode;

  /**
   * Description to show below the title.
   */
  description?: React.ReactNode;

  /**
   * Example code snippet to display in the tooltip.
   */
  codeExample?: string;

  /**
   * Language for the code snippet syntax highlighting.
   */
  codeLanguage?: string;

  /**
   * Placement of the tooltip relative to the trigger.
   * @default 'right'
   */
  placement?: TooltipPlacement;

  /**
   * Visual variant of the tooltip.
   * @default 'default'
   */
  variant?: TooltipVariant;

  /**
   * Whether the tooltip should open on hover (true) or click (false).
   * @default true
   */
  hoverOpen?: boolean;

  /**
   * Delay in milliseconds before the tooltip opens.
   * @default 300
   */
  openDelay?: number;

  /**
   * Delay in milliseconds before the tooltip closes.
   * @default 150
   */
  closeDelay?: number;

  /**
   * Maximum width of the tooltip content.
   * @default 400
   */
  maxWidth?: number;

  /**
   * Whether to render a border around the tooltip.
   * @default true
   */
  bordered?: boolean;

  /**
   * Whether to show a shadow effect.
   * @default true
   */
  shadowed?: boolean;

  /**
   * Icon to display next to the trigger when active.
   */
  activeIcon?: React.ReactNode;

  /**
   * Whether the tooltip should stay open after first open.
   */
  persistOnOpen?: boolean;

  /**
   * Custom close button content.
   */
  closeButton?: React.ReactNode;

  /**
   * Whether to show a "Learn more" link.
   */
  showLearnMore?: boolean;

  /**
   * URL for the "Learn more" link.
   */
  learnMoreUrl?: string;

  /**
   * ARIA label for accessibility.
   */
  ariaLabel?: string;

  /**
   * Whether the tooltip is disabled.
   */
  disabled?: boolean;

  /**
   * Callback when tooltip opens.
   */
  onOpen?: () => void;

  /**
   * Callback when tooltip closes.
   */
  onClose?: () => void;

  /**
   * Additional CSS class for the tooltip.
   */
  tooltipClassName?: string;

  /**
   * Additional CSS class for the trigger.
   */
  triggerClassName?: string;
}

// ─── Constants ────────────────────────

const DEFAULT_MAX_WIDTH = 400;
const DEFAULT_OPEN_DELAY = 300;
const DEFAULT_CLOSE_DELAY = 150;

// ─── Icon Map ────────────────────────

const variantIcons: Record<TooltipVariant, React.ReactNode> = {
  default: <Info className="h-4 w-4" />,
  info: <Info className="h-4 w-4 text-blue-500" />,
  success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  warning: <AlertCircle className="h-4 w-4 text-yellow-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
  help: <Lightbulb className="h-4 w-4 text-amber-500" />,
  code: <BookOpen className="h-4 w-4 text-purple-500" />,
};

const variantBorders: Record<TooltipVariant, string> = {
  default: 'border-slate-200 dark:border-slate-700',
  info: 'border-blue-200 dark:border-blue-800',
  success: 'border-green-200 dark:border-green-800',
  warning: 'border-yellow-200 dark:border-yellow-800',
  error: 'border-red-200 dark:border-red-800',
  help: 'border-amber-200 dark:border-amber-800',
  code: 'border-purple-200 dark:border-purple-800',
};

const variantHeaders: Record<TooltipVariant, string> = {
  default: 'text-slate-900 dark:text-slate-100',
  info: 'text-blue-700 dark:text-blue-300',
  success: 'text-green-700 dark:text-green-300',
  warning: 'text-yellow-700 dark:text-yellow-300',
  error: 'text-red-700 dark:text-red-300',
  help: 'text-amber-700 dark:text-amber-300',
  code: 'text-purple-700 dark:text-purple-300',
};

// ─── Position Helper ────────────────────────

function getTooltipPosition(
  rect: DOMRect,
  placement: TooltipPlacement,
  tooltipWidth: number,
  tooltipHeight: number,
): { top: string; left: string; transform: string } {
  const gap = 8;

  let top = '';
  let left = '';
  let transform = '';

  switch (placement) {
    case 'top':
      top = `${rect.top - tooltipHeight - gap}px`;
      left = `${rect.left + rect.width / 2 - tooltipWidth / 2}px`;
      transform = 'translateX(-50%)';
      break;
    case 'top-start':
      top = `${rect.top - tooltipHeight - gap}px`;
      left = `${rect.left}px`;
      break;
    case 'top-end':
      top = `${rect.top - tooltipHeight - gap}px`;
      left = `${rect.left + rect.width - tooltipWidth}px`;
      break;
    case 'bottom':
      top = `${rect.bottom + gap}px`;
      left = `${rect.left + rect.width / 2 - tooltipWidth / 2}px`;
      transform = 'translateX(-50%)';
      break;
    case 'bottom-start':
      top = `${rect.bottom + gap}px`;
      left = `${rect.left}px`;
      break;
    case 'bottom-end':
      top = `${rect.bottom + gap}px`;
      left = `${rect.left + rect.width - tooltipWidth}px`;
      break;
    case 'left':
      top = `${rect.top + rect.height / 2 - tooltipHeight / 2}px`;
      left = `${rect.left - tooltipWidth - gap}px`;
      break;
    case 'left-start':
      top = `${rect.top}px`;
      left = `${rect.left - tooltipWidth - gap}px`;
      break;
    case 'left-end':
      top = `${rect.top + rect.height - tooltipHeight}px`;
      left = `${rect.left - tooltipWidth - gap}px`;
      break;
    case 'right':
      top = `${rect.top + rect.height / 2 - tooltipHeight / 2}px`;
      left = `${rect.right + gap}px`;
      break;
    case 'right-start':
      top = `${rect.top}px`;
      left = `${rect.right + gap}px`;
      break;
    case 'right-end':
      top = `${rect.top + rect.height - tooltipHeight}px`;
      left = `${rect.right + gap}px`;
      break;
  }

  return { top, left, transform };
}

// ─── Component ────────────────────────

/**
 * DocTooltip - An advanced documentation tooltip component.
 *
 * This component provides rich, customizable tooltips with support for:
 * - Markdown content rendering
 * - Code syntax highlighting
 * - Multiple placement options
 * - Keyboard navigation
 * - Custom variants and styling
 *
 * @example
 * <DocTooltip
 *   content="This is the tooltip content"
 *   title="Tooltip Title"
 *   codeExample="const x = 42;"
 *   codeLanguage="javascript"
 * >
 *   <InfoIcon />
 * </DocTooltip>
 */
export function DocTooltip({
  trigger,
  content,
  title,
  description,
  codeExample,
  codeLanguage = 'typescript',
  placement = 'right',
  variant = 'default',
  hoverOpen = true,
  openDelay = DEFAULT_OPEN_DELAY,
  closeDelay = DEFAULT_CLOSE_DELAY,
  maxWidth = DEFAULT_MAX_WIDTH,
  bordered = true,
  shadowed = true,
  activeIcon,
  persistOnOpen = false,
  closeButton,
  showLearnMore = false,
  learnMoreUrl = '#',
  ariaLabel,
  disabled = false,
  onOpen,
  onClose,
  tooltipClassName,
  triggerClassName,
  children,
  className,
  ...rest
}: DocTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipWidth, setTooltipWidth] = useState(0);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Handlers ───────────────────────

  /**
   * Open the tooltip.
   */
  const openTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (disabled) return;
    onOpen?.();
    setIsOpen(true);
  }, [disabled, onOpen]);

  /**
   * Close the tooltip.
   */
  const closeTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      onClose?.();
    }, closeDelay);
  }, [closeDelay, onClose]);

  /**
   * Toggle the tooltip state.
   */
  const toggleTooltip = useCallback(() => {
    if (isOpen && !persistOnOpen) {
      closeTooltip();
    } else {
      openTooltip();
    }
  }, [isOpen, persistOnOpen, openTooltip, closeTooltip]);

  // ─── Effects ───────────────────────

  useEffect(() => {
    if (isOpen && tooltipRef.current) {
      setTooltipWidth(tooltipRef.current.offsetWidth);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // ─── Computed Position ───────────────────────

  const position = isOpen && triggerRef?.current
    ? getTooltipPosition(
        triggerRef.current.getBoundingClientRect(),
        placement,
        tooltipWidth || maxWidth,
        0,
      )
    : null;

  // ─── Render ───────────────────────

  const TooltipContent = () => (
    <div
      ref={tooltipRef}
      className={cn(
        'z-50 rounded-xl bg-white dark:bg-slate-900',
        bordered && variantBorders[variant],
        shadowed && 'shadow-lg',
        className,
        isOpen && 'animate-in fade-in-0 zoom-in-95 duration-200',
        !isOpen && 'animate-out fade-out-0 zoom-out-95 duration-150',
        tooltipClassName,
      )}
      style={{
        maxWidth: `${maxWidth}px`,
        minWidth: '240px',
        ...(position ? {
          position: 'fixed',
          top: position.top,
          left: position.left,
          transform: position.transform,
        } : {}),
      }}
      role="tooltip"
      aria-label={ariaLabel || title?.toString()}
      {...rest}
    >
      {/* Header */}
      {(title || activeIcon) && (
        <div className={cn(
          'flex items-center gap-2 border-b px-4 py-3',
          variantBorders[variant],
        )}>
          {activeIcon || variantIcons[variant]}
          {title && (
            <span className={cn('text-sm font-semibold', variantHeaders[variant])}>
              {title}
            </span>
          )}
          {closeButton || (
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTooltip();
              }}
              className="ml-auto p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Close tooltip"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Body */}
      <div className="max-h-96 overflow-y-auto px-4 py-3">
        {description && (
          <div className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            {typeof description === 'string' ? (
              description
            ) : (
              description
            )}
          </div>
        )}

        {content && (
          <div className="text-sm text-slate-700 dark:text-slate-300">
            {typeof content === 'string' ? (
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return match ? (
                      <code className={cn('rounded bg-slate-100 px-1 py-0.5 text-xs', className)} {...props}>
                        {String(children).replace(/\n$/, '')}
                      </code>
                    ) : (
                      <code className={cn('rounded bg-slate-100 px-1 py-0.5 text-xs', className)} {...props}>
                        {String(children).replace(/\n$/, '')}
                      </code>
                    );
                  },
                  pre({ children, ...props }) {
                    return (
                      <pre className="my-2 overflow-x-auto rounded-lg border bg-slate-50 p-3 dark:bg-slate-800" {...props}>
                        {children}
                      </pre>
                    );
                  },
                  a({ href, children, ...props }) {
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" {...props}>
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            ) : (
              content
            )}
          </div>
        )}

        {/* Code Example */}
        {codeExample && (
          <div className="mt-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <BookOpen className="h-3 w-3" />
              <span>Example</span>
            </div>
            <div className="relative">
              <SyntaxHighlighter
                language={codeLanguage}
                style={lightCodeTheme as any}
                customStyle={{
                  margin: 0,
                  padding: '0.75rem',
                  fontSize: '0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: 'rgba(241, 245, 249, 0.8)',
                }}
                showLineNumbers={false}
              >
                {codeExample}
              </SyntaxHighlighter>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(codeExample);
                }}
                className="absolute right-2 top-2 p-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Copy code"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Learn More Link */}
        {showLearnMore && (
          <div className="mt-3 text-right">
            <a
              href={learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-600"
            >
              Learn more
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );

  // ─── Render Trigger or Children ───────────────────────

  const defaultTrigger = (
    <div
      ref={triggerRef}
      className={cn('cursor-help inline-flex items-center justify-center p-1', triggerClassName)}
      onMouseEnter={hoverOpen ? openTooltip : undefined}
      onMouseLeave={hoverOpen ? closeTooltip : undefined}
      onClick={!hoverOpen ? toggleTooltip : undefined}
      onFocus={hoverOpen ? openTooltip : undefined}
      onBlur={hoverOpen ? closeTooltip : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          closeTooltip();
        }
      }}
      tabIndex={0}
      role={hoverOpen ? 'button' : undefined}
      aria-haspopup="true"
      aria-expanded={isOpen}
    >
      {trigger || children || (
        <span className="inline-flex items-center justify-center rounded-full bg-slate-100 p-1 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
          {variantIcons[variant]}
        </span>
      )}
    </div>
  );

  return (
    <>
      {defaultTrigger}
      {isOpen && <TooltipContent />}
    </>
  );
}

// ─── Presets ───────────────────────

/**
 * Quick info icon that can be used as a trigger.
 */
export function InfoTooltip({ content, title, ...rest }: Omit<DocTooltipProps, 'trigger'>) {
  return (
    <DocTooltip content={content} title={title} {...rest}>
      <Info className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
    </DocTooltip>
  );
}

/**
 * Documentation link with tooltip.
 */
export function DocsLink({ href, content, title }: { href: string; content: React.ReactNode; title?: string }) {
  return (
    <DocTooltip
      content={content}
      title={title || 'Documentation'}
      showLearnMore
      learnMoreUrl={href}
      codeExample={href}
      codeLanguage="url"
      placement="bottom"
      variant="help"
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center text-xs text-blue-500 hover:underline"
      >
        Docs
        <ExternalLink className="ml-1 h-3 w-3" />
      </a>
    </DocTooltip>
  );
}

export default DocTooltip;
